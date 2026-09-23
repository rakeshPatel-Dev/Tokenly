use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntigravityDiscoveryResult {
    pub installed: bool,
    pub version: Option<String>,
    pub authenticated: bool,
    pub accounts: Vec<AntigravityAccountInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntigravityAccountInfo {
    pub account_id: String,
    pub email: Option<String>,
    pub display_name: String,
    pub identity_verified: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntigravityUsageResult {
    pub success: bool,
    pub authenticated: bool,
    pub account_id: String,
    pub email: Option<String>,
    pub identity_verified: bool,
    pub windows: Vec<AntigravityNormalizedWindow>,
    pub error: Option<String>,
    pub provider_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AntigravityNormalizedWindow {
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub window_type: String, // "weekly", "daily", "session", "custom"
    pub used_percent: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub used: Option<f64>,
    pub limit: Option<f64>,
    pub reset_at: Option<String>,
    pub description: Option<String>,
    pub source: String,
}

pub fn find_agy_binary() -> Option<PathBuf> {
    if let Ok(out) = Command::new("which").arg("agy").output() {
        if out.status.success() {
            let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !p.is_empty() {
                return Some(PathBuf::from(p));
            }
        }
    }
    let home = dirs::home_dir()?;
    let fallback = home.join(".local").join("bin").join("agy");
    if fallback.exists() {
        return Some(fallback);
    }
    None
}

pub fn get_agy_version() -> Option<String> {
    let bin = find_agy_binary()?;
    let out = Command::new(bin).arg("--version").output().ok()?;
    if out.status.success() {
        let v = String::from_utf8_lossy(&out.stdout).trim().to_string();
        Some(v)
    } else {
        None
    }
}

pub fn detect_antigravity_account_email() -> Option<String> {
    // Check if google-account or gemini config specifies an email or user profile
    if let Some(home) = dirs::home_dir() {
        let config_dir = home.join(".gemini");
        if let Ok(content) = std::fs::read_to_string(config_dir.join("antigravity-cli").join("settings.json")) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(email) = json.get("email").and_then(|v| v.as_str()) {
                    return Some(email.to_string());
                }
                if let Some(user) = json.get("user").and_then(|u| u.get("email")).and_then(|e| e.as_str()) {
                    return Some(user.to_string());
                }
            }
        }
    }
    None
}

pub fn detect_antigravity_account_email_for_home(home_dir: &PathBuf) -> Option<String> {
    let config_file = home_dir.join(".gemini").join("antigravity-cli").join("settings.json");
    if let Ok(content) = std::fs::read_to_string(config_file) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(email) = json.get("email").and_then(|v| v.as_str()) {
                return Some(email.to_string());
            }
            if let Some(user) = json.get("user").and_then(|u| u.get("email")).and_then(|e| e.as_str()) {
                return Some(user.to_string());
            }
        }
    }
    None
}

pub fn query_antigravity_usage(agy_home: Option<&str>) -> AntigravityUsageResult {
    let bin = match find_agy_binary() {
        Some(b) => b,
        None => {
            return AntigravityUsageResult {
                success: false,
                authenticated: false,
                account_id: "antigravity-default".into(),
                email: None,
                identity_verified: false,
                windows: vec![],
                error: Some("Google Antigravity CLI ('agy') is not installed or not in PATH".into()),
                provider_version: None,
            };
        }
    };

    let version = get_agy_version();
    
    // Determine profile home
    let resolved_home: Option<PathBuf> = match agy_home {
        Some(h) if h != "default" && !h.trim().is_empty() => {
            if h.starts_with('~') {
                dirs::home_dir().map(|base| {
                    let stripped = h.strip_prefix("~/").unwrap_or(h.strip_prefix("~").unwrap_or(""));
                    base.join(stripped)
                })
            } else {
                Some(PathBuf::from(h))
            }
        }
        _ => dirs::home_dir(),
    };

    let email_opt = resolved_home
        .as_ref()
        .and_then(detect_antigravity_account_email_for_home)
        .or_else(detect_antigravity_account_email);
    let identity_verified = email_opt.is_some();

    // Execute agy --print /usage --output-format json
    let mut cmd = Command::new(&bin);
    cmd.arg("--print").arg("/usage").arg("--output-format").arg("json");

    if let Some(ref home_path) = resolved_home {
        cmd.env("HOME", home_path);
    }

    let output = match cmd.output() {
        Ok(out) => out,
        Err(e) => {
            return AntigravityUsageResult {
                success: false,
                authenticated: false,
                account_id: "antigravity-default".into(),
                email: email_opt,
                identity_verified,
                windows: vec![],
                error: Some(format!("Failed to execute 'agy': {}", e)),
                provider_version: version,
            };
        }
    };

    if !output.status.success() {
        let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
        let is_auth = stderr_str.contains("login") || stderr_str.contains("auth") || stderr_str.contains("unauthenticated");
        return AntigravityUsageResult {
            success: false,
            authenticated: !is_auth,
            account_id: "antigravity-default".into(),
            email: email_opt,
            identity_verified,
            windows: vec![],
            error: Some(if is_auth {
                "Antigravity authentication required. Run 'agy' to log in.".into()
            } else {
                format!("agy execution failed: {}", stderr_str.trim())
            }),
            provider_version: version,
        };
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
    let parsed: serde_json::Value = match serde_json::from_str(&stdout_str) {
        Ok(v) => v,
        Err(e) => {
            return AntigravityUsageResult {
                success: false,
                authenticated: true,
                account_id: "antigravity-default".into(),
                email: email_opt,
                identity_verified,
                windows: vec![],
                error: Some(format!("Failed to parse JSON output from agy: {}", e)),
                provider_version: version,
            };
        }
    };

    // Extract command.data.groups
    let mut windows = Vec::new();
    if let Some(groups) = parsed
        .get("command")
        .and_then(|c| c.get("data"))
        .and_then(|d| d.get("groups"))
        .and_then(|g| g.as_array())
    {
        for group in groups {
            let group_name = group
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("General")
                .to_string();

            if let Some(buckets) = group.get("buckets").and_then(|b| b.as_array()) {
                for bucket in buckets {
                    let bucket_id = bucket
                        .get("id")
                        .and_then(|i| i.as_str())
                        .unwrap_or("bucket")
                        .to_string();

                    let name = bucket
                        .get("name")
                        .and_then(|n| n.as_str())
                        .unwrap_or(&bucket_id)
                        .to_string();

                    let window_str = bucket
                        .get("window")
                        .and_then(|w| w.as_str())
                        .unwrap_or("weekly")
                        .to_string();

                    let remaining_frac = bucket
                        .get("remaining_fraction")
                        .and_then(|f| f.as_f64());

                    let (remaining_pct, used_pct) = match remaining_frac {
                        Some(frac) => {
                            let rem = (frac * 100.0).clamp(0.0, 100.0);
                            let used = (100.0 - rem).clamp(0.0, 100.0);
                            (Some(rem), Some(used))
                        }
                        None => (None, None),
                    };

                    let reset_time = bucket
                        .get("reset_time")
                        .and_then(|r| r.as_str())
                        .map(|s| s.to_string());

                    let description = bucket
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|s| s.to_string());

                    windows.push(AntigravityNormalizedWindow {
                        id: bucket_id,
                        name: format!("{} ({})", group_name, name),
                        group_name: group_name.clone(),
                        window_type: window_str,
                        used_percent: used_pct,
                        remaining_percent: remaining_pct,
                        used: None,
                        limit: None,
                        reset_at: reset_time,
                        description,
                        source: "official_cli".into(),
                    });
                }
            }
        }
    }

    let has_windows = !windows.is_empty();
    let is_auth = parsed.get("status").and_then(|s| s.as_str()) == Some("SUCCESS") || has_windows;

    AntigravityUsageResult {
        success: true,
        authenticated: is_auth,
        account_id: "antigravity-default".into(),
        email: email_opt,
        identity_verified,
        error: if !has_windows {
            Some("No quota buckets returned by agy".into())
        } else {
            None
        },
        windows,
        provider_version: version,
    }
}
