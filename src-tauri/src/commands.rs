use crate::antigravity;
use crate::codex;
use crate::db::{self, AccountRecord, DbState, ProviderMetadataRecord, UsageWindowRecord};
use crate::scheduler::SchedulerHandle;
use tauri::State;

#[tauri::command]
pub fn list_accounts(state: State<DbState>) -> Result<Vec<AccountRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::list_accounts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_account(account: AccountRecord, state: State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_account(&conn, &account).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_account(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_account(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_latest_usage(account_id: String, state: State<DbState>) -> Result<Vec<UsageWindowRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_latest_usage_for_account(&conn, &account_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_usage_history(account_id: String, limit: Option<u32>, state: State<DbState>) -> Result<Vec<UsageWindowRecord>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_usage_history_for_account(&conn, &account_id, limit.unwrap_or(20)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn detect_providers(state: State<DbState>) -> Result<Vec<ProviderMetadataRecord>, String> {
    let codex_ver = codex::get_codex_version();
    let agy_ver = antigravity::get_agy_version();
    let now = chrono::Utc::now().to_rfc3339();

    let codex_installed = codex_ver.is_some();
    let agy_installed = agy_ver.is_some();

    let meta_codex = ProviderMetadataRecord {
        provider: "codex".into(),
        installed: codex_installed,
        version: codex_ver.clone(),
        last_successful_version: codex_ver,
        status: if codex_installed { "detected".into() } else { "not_installed".into() },
        status_message: None,
        updated_at: now.clone(),
    };

    let meta_agy = ProviderMetadataRecord {
        provider: "antigravity".into(),
        installed: agy_installed,
        version: agy_ver.clone(),
        last_successful_version: agy_ver,
        status: if agy_installed { "detected".into() } else { "not_installed".into() },
        status_message: None,
        updated_at: now,
    };

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let _ = db::save_provider_metadata(&conn, &meta_codex);
    let _ = db::save_provider_metadata(&conn, &meta_agy);

    Ok(vec![meta_codex, meta_agy])
}

/// Non-blocking: runs provider query on a threadpool so the window stays responsive.
#[tauri::command]
pub async fn query_codex(codex_home: Option<String>) -> Result<codex::CodexRateLimitsResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        codex::query_codex_rate_limits(codex_home.as_deref())
    })
    .await
    .map_err(|e| e.to_string())
}

/// Non-blocking: runs provider query on a threadpool so the window stays responsive.
#[tauri::command]
pub async fn query_antigravity(agy_home: Option<String>) -> Result<antigravity::AntigravityUsageResult, String> {
    tauri::async_runtime::spawn_blocking(move || antigravity::query_antigravity_usage(agy_home.as_deref()))
        .await
        .map_err(|e| e.to_string())
}

/// Non-blocking: runs the provider query on a threadpool, so the UI stays responsive.
#[tauri::command]
pub async fn refresh_account(
    account_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<UsageWindowRecord>, String> {
    let account = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let accounts = db::list_accounts(&conn).map_err(|e| e.to_string())?;
        accounts.into_iter().find(|a| a.id == account_id)
    };

    let acc = match account {
        Some(a) => a,
        None => return Err(format!("Account not found: {}", account_id)),
    };

    // Run slow provider I/O off the async executor
    let (snapshots, updated_acc) = tauri::async_runtime::spawn_blocking(move || {
        let now = chrono::Utc::now().to_rfc3339();
        let mut snapshots = Vec::new();
        let mut acc = acc;

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
                if let Some(email) = res.email { acc.email = Some(email); }
                if let Some(plan) = res.plan_type { acc.plan = Some(plan); }
                if let Some(act_id) = res.account_id { acc.provider_account_id = Some(act_id); }

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
            let agy_home = if acc.auth_profile_id != "default" && !acc.auth_profile_id.trim().is_empty() {
                Some(acc.auth_profile_id.clone())
            } else {
                None
            };
            let res = antigravity::query_antigravity_usage(agy_home.as_deref());
            if res.success {
                if let Some(email) = res.email { acc.email = Some(email); }

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

        acc.last_checked_at = Some(now.clone());
        acc.updated_at = chrono::Utc::now().to_rfc3339();
        (snapshots, acc)
    })
    .await
    .map_err(|e| e.to_string())?;

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let _ = db::save_account(&conn, &updated_acc);
    for snap in &snapshots {
        let _ = db::save_usage_snapshot(&conn, snap);
    }

    Ok(snapshots)
}

/// Refresh all enabled accounts sequentially (still non-blocking).
#[tauri::command]
pub async fn refresh_all_accounts(state: State<'_, DbState>) -> Result<(), String> {
    let accounts = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::list_accounts(&conn).map_err(|e| e.to_string())?
    };

    for acc in accounts.into_iter().filter(|a| a.enabled) {
        let id = acc.id.clone();
        let _ = refresh_account(id, state.clone()).await;
    }
    Ok(())
}

#[tauri::command]
pub fn get_setting(key: String, state: State<DbState>) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_setting(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(key: String, value: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}

/// Tell the background scheduler the window visibility has changed.
/// Called from the frontend when the window is hidden/shown.
#[tauri::command]
pub fn set_window_visible(visible: bool, scheduler: State<SchedulerHandle>) -> Result<(), String> {
    scheduler.set_window_visible(visible);
    Ok(())
}

/// Reconfigure refresh intervals at runtime (e.g. from the Settings modal).
#[tauri::command]
pub fn set_refresh_intervals(
    fg_secs: u64,
    bg_secs: u64,
    scheduler: State<SchedulerHandle>,
) -> Result<(), String> {
    scheduler.set_intervals(fg_secs, bg_secs);
    Ok(())
}
