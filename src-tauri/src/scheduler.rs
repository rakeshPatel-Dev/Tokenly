/// Background refresh scheduler that runs independently of the window.
///
/// This module owns a Tokio runtime and a repeating timer. It calls the
/// provider adapters on a configurable interval and writes snapshots to
/// SQLite. Because it lives on a native thread it continues to work even
/// when the Tauri window is hidden or closed to the system tray.
use crate::antigravity;
use crate::codex;
use crate::db::{self, AccountRecord, UsageWindowRecord};

use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::watch;
use tokio::time::interval;

/// Seconds between foreground (window visible) refreshes. Default 60 s.
pub const DEFAULT_FG_SECS: u64 = 60;
/// Seconds between background (window hidden / tray) refreshes. Default 300 s.
pub const DEFAULT_BG_SECS: u64 = 300;

/// Message sent over the watch channel to reconfigure the scheduler.
#[derive(Clone, Debug)]
pub struct RefreshConfig {
    pub fg_secs: u64,
    pub bg_secs: u64,
    pub window_visible: bool,
}

impl Default for RefreshConfig {
    fn default() -> Self {
        Self {
            fg_secs: DEFAULT_FG_SECS,
            bg_secs: DEFAULT_BG_SECS,
            window_visible: true,
        }
    }
}

/// Handle held by Tauri state so commands can reconfigure the scheduler.
pub struct SchedulerHandle {
    pub config_tx: watch::Sender<RefreshConfig>,
}

impl SchedulerHandle {
    pub fn set_window_visible(&self, visible: bool) {
        let mut cfg = self.config_tx.borrow().clone();
        cfg.window_visible = visible;
        let _ = self.config_tx.send(cfg);
    }

    pub fn set_intervals(&self, fg_secs: u64, bg_secs: u64) {
        let mut cfg = self.config_tx.borrow().clone();
        cfg.fg_secs = fg_secs;
        cfg.bg_secs = bg_secs;
        let _ = self.config_tx.send(cfg);
    }
}

/// Refresh every enabled account and persist snapshots + updated metadata to SQLite.
fn run_refresh_cycle(db_conn: &Arc<Mutex<rusqlite::Connection>>) {
    let conn = match db_conn.lock() {
        Ok(c) => c,
        Err(_) => return,
    };

    let accounts: Vec<AccountRecord> = match db::list_accounts(&conn) {
        Ok(a) => a,
        Err(_) => return,
    };

    // Release the lock before doing slow I/O (child process spawn)
    drop(conn);

    for acc in accounts.into_iter().filter(|a| a.enabled) {
        let (windows, updated_acc) = fetch_windows_for_account(&acc);
        if windows.is_empty() {
            continue;
        }

        // Re-acquire lock just for the write
        if let Ok(conn) = db_conn.lock() {
            // Write back email / plan / last_checked_at discovered during the fetch
            let _ = db::save_account(&conn, &updated_acc);
            for snap in &windows {
                let _ = db::save_usage_snapshot(&conn, snap);
            }
        }
    }
}

/// Query the provider for one account and return both the new snapshots and the
/// updated account record (with email / plan / last_checked_at filled in).
fn fetch_windows_for_account(acc: &AccountRecord) -> (Vec<UsageWindowRecord>, AccountRecord) {
    let now = chrono::Utc::now().to_rfc3339();
    let mut snapshots = Vec::new();
    let mut updated_acc = acc.clone();
    updated_acc.last_checked_at = Some(now.clone());
    updated_acc.updated_at = now.clone();

    if acc.provider == "codex" {
        let codex_home = if acc.auth_profile_id.starts_with('/')
            || acc.auth_profile_id.starts_with('~')
        {
            Some(acc.auth_profile_id.clone())
        } else {
            None
        };

        let res = codex::query_codex_rate_limits(codex_home.as_deref());
        if res.success {
            if let Some(email) = res.email { updated_acc.email = Some(email); }
            if let Some(plan) = res.plan_type { updated_acc.plan = Some(plan); }
            if let Some(act_id) = res.account_id { updated_acc.provider_account_id = Some(act_id); }

            for w in res.windows {
                snapshots.push(UsageWindowRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    account_id: acc.id.clone(),
                    name: w.name,
                    window_type: w.window_type,
                    used_percent: w.used_percent,
                    remaining_percent: w.remaining_percent,
                    used: w.used,
                    limit: w.limit,
                    reset_at: w.reset_at,
                    source: w.source,
                    fetched_at: now.clone(),
                });
            }
        }
    } else if acc.provider == "antigravity" {
        let agy_home = if acc.auth_profile_id != "default"
            && !acc.auth_profile_id.trim().is_empty()
        {
            Some(acc.auth_profile_id.clone())
        } else {
            None
        };
        let res = antigravity::query_antigravity_usage(agy_home.as_deref());
        if res.success {
            if let Some(email) = res.email { updated_acc.email = Some(email); }

            for w in res.windows {
                snapshots.push(UsageWindowRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    account_id: acc.id.clone(),
                    name: w.name,
                    window_type: w.window_type,
                    used_percent: w.used_percent,
                    remaining_percent: w.remaining_percent,
                    used: w.used,
                    limit: w.limit,
                    reset_at: w.reset_at,
                    source: w.source,
                    fetched_at: now.clone(),
                });
            }
        }
    }

    (snapshots, updated_acc)
}

/// Spawn the background scheduler on a dedicated Tokio runtime thread.
/// Returns a `SchedulerHandle` that allows runtime reconfiguration.
pub fn spawn(db_conn: Arc<Mutex<rusqlite::Connection>>) -> SchedulerHandle {
    let (config_tx, mut config_rx) = watch::channel(RefreshConfig::default());

    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("Failed to build Tokio runtime for refresh scheduler");

        rt.block_on(async move {
            let mut cfg = config_rx.borrow().clone();
            let mut tick_interval = interval(Duration::from_secs(cfg.fg_secs));
            // Skip the immediate first tick so we don't double-refresh on startup
            tick_interval.tick().await;

            loop {
                tokio::select! {
                    _ = tick_interval.tick() => {
                        let conn_clone = Arc::clone(&db_conn);
                        tokio::task::spawn_blocking(move || {
                            run_refresh_cycle(&conn_clone);
                        }).await.ok();

                        // Recalculate interval after each tick in case config changed
                        cfg = config_rx.borrow().clone();
                        let secs = if cfg.window_visible { cfg.fg_secs } else { cfg.bg_secs };
                        tick_interval = interval(Duration::from_secs(secs));
                        tick_interval.tick().await; // consume the immediate tick
                    }

                    Ok(_) = config_rx.changed() => {
                        cfg = config_rx.borrow().clone();
                        let secs = if cfg.window_visible { cfg.fg_secs } else { cfg.bg_secs };
                        tick_interval = interval(Duration::from_secs(secs));
                        tick_interval.tick().await;
                    }
                }
            }
        });
    });

    SchedulerHandle { config_tx }
}
