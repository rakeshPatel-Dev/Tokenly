use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountRecord {
    pub id: String,
    pub provider: String, // "codex" | "antigravity"
    pub provider_account_id: Option<String>,
    pub email: Option<String>,
    pub display_name: Option<String>,
    pub plan: Option<String>,
    pub auth_profile_id: String,
    pub enabled: bool,
    pub last_checked_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageWindowRecord {
    pub id: String,
    pub account_id: String,
    pub name: String,
    pub window_type: String, // "session" | "hourly" | "daily" | "weekly" | "monthly" | "custom"
    pub used_percent: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub used: Option<f64>,
    pub limit: Option<f64>,
    pub reset_at: Option<String>,
    pub source: String, // "official_cli" | "official_app_server"
    pub fetched_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProviderMetadataRecord {
    pub provider: String,
    pub installed: bool,
    pub version: Option<String>,
    pub last_successful_version: Option<String>,
    pub status: String,
    pub status_message: Option<String>,
    pub updated_at: String,
}

pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
}

impl DbState {
    pub fn new() -> Result<Self> {
        let db_path = get_database_path();
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(&db_path)?;
        init_schema(&conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}

pub fn get_database_path() -> PathBuf {
    if let Some(config_dir) = dirs::data_local_dir() {
        config_dir.join("tokenly").join("tokenly.db")
    } else {
        PathBuf::from("tokenly.db")
    }
}

fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            provider_account_id TEXT,
            email TEXT,
            display_name TEXT,
            plan TEXT,
            auth_profile_id TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1,
            last_checked_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usage_snapshots (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            name TEXT NOT NULL,
            window_type TEXT NOT NULL,
            used_percent REAL,
            remaining_percent REAL,
            used REAL,
            window_limit REAL,
            reset_at TEXT,
            source TEXT NOT NULL,
            fetched_at TEXT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS provider_metadata (
            provider TEXT PRIMARY KEY,
            installed INTEGER NOT NULL DEFAULT 0,
            version TEXT,
            last_successful_version TEXT,
            status TEXT NOT NULL DEFAULT 'unknown',
            status_message TEXT,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_usage_snapshots_account ON usage_snapshots(account_id);
        CREATE INDEX IF NOT EXISTS idx_usage_snapshots_fetched_at ON usage_snapshots(fetched_at);
        ",
    )?;
    Ok(())
}

// Account operations
pub fn list_accounts(conn: &Connection) -> Result<Vec<AccountRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, provider, provider_account_id, email, display_name, plan, auth_profile_id, enabled, last_checked_at, created_at, updated_at FROM accounts ORDER BY created_at ASC"
    )?;

    let iter = stmt.query_map([], |row| {
        Ok(AccountRecord {
            id: row.get(0)?,
            provider: row.get(1)?,
            provider_account_id: row.get(2)?,
            email: row.get(3)?,
            display_name: row.get(4)?,
            plan: row.get(5)?,
            auth_profile_id: row.get(6)?,
            enabled: row.get::<_, i64>(7)? != 0,
            last_checked_at: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;

    let mut result = Vec::new();
    for account in iter {
        result.push(account?);
    }
    Ok(result)
}

pub fn save_account(conn: &Connection, acc: &AccountRecord) -> Result<()> {
    conn.execute(
        "INSERT INTO accounts (id, provider, provider_account_id, email, display_name, plan, auth_profile_id, enabled, last_checked_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT(id) DO UPDATE SET
            provider=excluded.provider,
            provider_account_id=excluded.provider_account_id,
            email=excluded.email,
            display_name=excluded.display_name,
            plan=excluded.plan,
            auth_profile_id=excluded.auth_profile_id,
            enabled=excluded.enabled,
            last_checked_at=excluded.last_checked_at,
            updated_at=excluded.updated_at",
        params![
            acc.id,
            acc.provider,
            acc.provider_account_id,
            acc.email,
            acc.display_name,
            acc.plan,
            acc.auth_profile_id,
            if acc.enabled { 1 } else { 0 },
            acc.last_checked_at,
            acc.created_at,
            acc.updated_at,
        ],
    )?;
    Ok(())
}

pub fn delete_account(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])?;
    Ok(())
}

// Usage Snapshot operations
pub fn save_usage_snapshot(conn: &Connection, snapshot: &UsageWindowRecord) -> Result<()> {
    conn.execute(
        "INSERT INTO usage_snapshots (id, account_id, name, window_type, used_percent, remaining_percent, used, window_limit, reset_at, source, fetched_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            snapshot.id,
            snapshot.account_id,
            snapshot.name,
            snapshot.window_type,
            snapshot.used_percent,
            snapshot.remaining_percent,
            snapshot.used,
            snapshot.limit,
            snapshot.reset_at,
            snapshot.source,
            snapshot.fetched_at,
        ],
    )?;
    Ok(())
}

pub fn get_latest_usage_for_account(conn: &Connection, account_id: &str) -> Result<Vec<UsageWindowRecord>> {
    // Get distinct window names for the latest fetch
    let mut stmt = conn.prepare(
        "SELECT id, account_id, name, window_type, used_percent, remaining_percent, used, window_limit, reset_at, source, fetched_at
         FROM usage_snapshots
         WHERE account_id = ?1 AND fetched_at = (SELECT MAX(fetched_at) FROM usage_snapshots WHERE account_id = ?1)
         ORDER BY name ASC"
    )?;

    let iter = stmt.query_map(params![account_id], |row| {
        Ok(UsageWindowRecord {
            id: row.get(0)?,
            account_id: row.get(1)?,
            name: row.get(2)?,
            window_type: row.get(3)?,
            used_percent: row.get(4)?,
            remaining_percent: row.get(5)?,
            used: row.get(6)?,
            limit: row.get(7)?,
            reset_at: row.get(8)?,
            source: row.get(9)?,
            fetched_at: row.get(10)?,
        })
    })?;

    let mut result = Vec::new();
    for window in iter {
        result.push(window?);
    }
    Ok(result)
}

pub fn get_usage_history_for_account(conn: &Connection, account_id: &str, limit: u32) -> Result<Vec<UsageWindowRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, name, window_type, used_percent, remaining_percent, used, window_limit, reset_at, source, fetched_at
         FROM usage_snapshots
         WHERE account_id = ?1
         ORDER BY fetched_at DESC
         LIMIT ?2"
    )?;

    let iter = stmt.query_map(params![account_id, limit], |row| {
        Ok(UsageWindowRecord {
            id: row.get(0)?,
            account_id: row.get(1)?,
            name: row.get(2)?,
            window_type: row.get(3)?,
            used_percent: row.get(4)?,
            remaining_percent: row.get(5)?,
            used: row.get(6)?,
            limit: row.get(7)?,
            reset_at: row.get(8)?,
            source: row.get(9)?,
            fetched_at: row.get(10)?,
        })
    })?;

    let mut result = Vec::new();
    for window in iter {
        result.push(window?);
    }
    Ok(result)
}

// Provider Metadata operations
pub fn get_provider_metadata(conn: &Connection, provider: &str) -> Result<Option<ProviderMetadataRecord>> {
    let mut stmt = conn.prepare(
        "SELECT provider, installed, version, last_successful_version, status, status_message, updated_at
         FROM provider_metadata WHERE provider = ?1"
    )?;

    let mut iter = stmt.query_map(params![provider], |row| {
        Ok(ProviderMetadataRecord {
            provider: row.get(0)?,
            installed: row.get::<_, i64>(1)? != 0,
            version: row.get(2)?,
            last_successful_version: row.get(3)?,
            status: row.get(4)?,
            status_message: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;

    if let Some(res) = iter.next() {
        Ok(Some(res?))
    } else {
        Ok(None)
    }
}

pub fn save_provider_metadata(conn: &Connection, meta: &ProviderMetadataRecord) -> Result<()> {
    conn.execute(
        "INSERT INTO provider_metadata (provider, installed, version, last_successful_version, status, status_message, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(provider) DO UPDATE SET
            installed=excluded.installed,
            version=excluded.version,
            last_successful_version=COALESCE(excluded.last_successful_version, provider_metadata.last_successful_version),
            status=excluded.status,
            status_message=excluded.status_message,
            updated_at=excluded.updated_at",
        params![
            meta.provider,
            if meta.installed { 1 } else { 0 },
            meta.version,
            meta.last_successful_version,
            meta.status,
            meta.status_message,
            meta.updated_at,
        ],
    )?;
    Ok(())
}

// Settings operations
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut iter = stmt.query_map(params![key], |row| row.get(0))?;
    if let Some(res) = iter.next() {
        Ok(Some(res?))
    } else {
        Ok(None)
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        params![key, value, now],
    )?;
    Ok(())
}
