use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodexDiscoveryResult {
    pub installed: bool,
    pub version: Option<String>,
    pub profiles: Vec<CodexProfileInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodexProfileInfo {
    pub profile_id: String,
    pub codex_home: String,
    pub authenticated: bool,
    pub email: Option<String>,
    pub plan_type: Option<String>,
    pub account_id: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodexRateLimitsResult {
    pub success: bool,
    pub authenticated: bool,
    pub account_id: Option<String>,
    pub plan_type: Option<String>,
    pub email: Option<String>,
    pub windows: Vec<CodexNormalizedWindow>,
    pub raw_credits: Option<serde_json::Value>,
    pub error: Option<String>,
    pub provider_version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CodexNormalizedWindow {
    pub name: String,
    pub window_type: String, // "session", "hourly", "daily", "weekly", "custom"
    pub used_percent: Option<f64>,
    pub remaining_percent: Option<f64>,
    pub used: Option<f64>,
    pub limit: Option<f64>,
    pub reset_at: Option<String>,
    pub window_duration_mins: Option<i64>,
    pub source: String,
}

pub fn find_codex_binary() -> Option<PathBuf> {
    // 1. Check PATH entries
    if let Some(paths) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&paths) {
            let candidate = dir.join("codex");
            if candidate.is_file() {
                return Some(candidate);
            }
            #[cfg(target_os = "windows")]
            {
                for ext in &["exe", "cmd", "bat"] {
                    let with_ext = dir.join(format!("codex.{}", ext));
                    if with_ext.is_file() {
                        return Some(with_ext);
                    }
                }
            }
        }
    }

    // 2. Check common installation directories (Homebrew on macOS, npm on Windows/Linux)
    if let Some(home) = dirs::home_dir() {
        #[allow(unused_mut)]
        let mut candidates = vec![
            home.join(".local").join("bin").join("codex"),
            home.join(".cargo").join("bin").join("codex"),
        ];

        #[cfg(target_os = "macos")]
        {
            candidates.push(PathBuf::from("/opt/homebrew/bin/codex"));
            candidates.push(PathBuf::from("/usr/local/bin/codex"));
        }

        #[cfg(target_os = "windows")]
        {
            candidates.push(home.join("AppData").join("Roaming").join("npm").join("codex.cmd"));
            candidates.push(home.join("AppData").join("Local").join("Programs").join("codex").join("codex.exe"));
        }

        for c in candidates {
            if c.is_file() {
                return Some(c);
            }
        }
    }

    // 3. Platform-appropriate CLI lookup tool
    #[cfg(target_os = "windows")]
    let tool = "where";
    #[cfg(not(target_os = "windows"))]
    let tool = "which";

    if let Ok(out) = Command::new(tool).arg("codex").output() {
        if out.status.success() {
            let first_line = String::from_utf8_lossy(&out.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !first_line.is_empty() {
                let p = PathBuf::from(first_line);
                if p.is_file() {
                    return Some(p);
                }
            }
        }
    }

    None
}

pub fn get_codex_version() -> Option<String> {
    let bin = find_codex_binary()?;
    let out = Command::new(bin).arg("--version").output().ok()?;
    if out.status.success() {
        let v = String::from_utf8_lossy(&out.stdout).trim().to_string();
        Some(v)
    } else {
        None
    }
}

pub fn discover_codex_profiles() -> Vec<PathBuf> {
    let mut profiles = Vec::new();
    if let Some(home) = dirs::home_dir() {
        let default_home = home.join(".codex");
        if default_home.exists() {
            profiles.push(default_home);
        }
        if let Ok(entries) = std::fs::read_dir(&home) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(".codex-") && entry.path().is_dir() {
                    profiles.push(entry.path());
                }
            }
        }
    }
    if profiles.is_empty() {
        if let Some(home) = dirs::home_dir() {
            profiles.push(home.join(".codex"));
        }
    }
    profiles
}

pub fn query_codex_rate_limits(codex_home: Option<&str>) -> CodexRateLimitsResult {
    let bin = match find_codex_binary() {
        Some(b) => b,
        None => {
            return CodexRateLimitsResult {
                success: false,
                authenticated: false,
                account_id: None,
                plan_type: None,
                email: None,
                windows: vec![],
                raw_credits: None,
                error: Some("OpenAI Codex CLI is not installed or not in PATH".into()),
                provider_version: None,
            };
        }
    };

    let version = get_codex_version();

    let mut cmd = Command::new(&bin);
    cmd.arg("app-server").arg("--stdio");
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::null());

    if let Some(home_path) = codex_home {
        let expanded = if home_path.starts_with('~') {
            if let Some(home) = dirs::home_dir() {
                let stripped = home_path.strip_prefix("~/").unwrap_or(home_path.strip_prefix("~").unwrap_or(""));
                home.join(stripped)
            } else {
                PathBuf::from(home_path)
            }
        } else {
            PathBuf::from(home_path)
        };
        cmd.env("CODEX_HOME", expanded);
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return CodexRateLimitsResult {
                success: false,
                authenticated: false,
                account_id: None,
                plan_type: None,
                email: None,
                windows: vec![],
                raw_credits: None,
                error: Some(format!("Failed to start codex app-server: {}", e)),
                provider_version: version,
            };
        }
    };

    let stdin = match child.stdin.as_mut() {
        Some(s) => s,
        None => {
            let _ = child.kill();
            return CodexRateLimitsResult {
                success: false,
                authenticated: false,
                account_id: None,
                plan_type: None,
                email: None,
                windows: vec![],
                raw_credits: None,
                error: Some("Failed to access app-server stdin".into()),
                provider_version: version,
            };
        }
    };

    // 1. Send initialize
    let init_req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "clientInfo": {
                "name": "tokenly",
                "version": "0.1.0"
            }
        }
    });

    if stdin.write_all(format!("{}\n", init_req).as_bytes()).is_err() || stdin.flush().is_err() {
        let _ = child.kill();
        return CodexRateLimitsResult {
            success: false,
            authenticated: false,
            account_id: None,
            plan_type: None,
            email: None,
            windows: vec![],
            raw_credits: None,
            error: Some("Failed to write initialize to app-server".into()),
            provider_version: version,
        };
    }

    // 2. Send account/rateLimits/read
    let rate_req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "account/rateLimits/read",
        "params": {}
    });

    if stdin.write_all(format!("{}\n", rate_req).as_bytes()).is_err() || stdin.flush().is_err() {
        let _ = child.kill();
        return CodexRateLimitsResult {
            success: false,
            authenticated: false,
            account_id: None,
            plan_type: None,
            email: None,
            windows: vec![],
            raw_credits: None,
            error: Some("Failed to write rateLimits request".into()),
            provider_version: version,
        };
    }

    // 3. Send account/read to attempt fetching email
    let account_req = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "account/read",
        "params": {}
    });
    let _ = stdin.write_all(format!("{}\n", account_req).as_bytes());
    let _ = stdin.flush();

    let stdout = match child.stdout.take() {
        Some(s) => s,
        None => {
            let _ = child.kill();
            return CodexRateLimitsResult {
                success: false,
                authenticated: false,
                account_id: None,
                plan_type: None,
                email: None,
                windows: vec![],
                raw_credits: None,
                error: Some("Failed to read from app-server stdout".into()),
                provider_version: version,
            };
        }
    };

    let reader = BufReader::new(stdout);
    let mut rate_response: Option<serde_json::Value> = None;
    let mut account_response: Option<serde_json::Value> = None;

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line) {
            if let Some(id) = parsed.get("id").and_then(|v| v.as_i64()) {
                if id == 2 {
                    rate_response = Some(parsed);
                } else if id == 3 {
                    account_response = Some(parsed);
                }
            }
        }

        if rate_response.is_some() && account_response.is_some() {
            break;
        }
    }

    let _ = child.kill();

    let rate_json = match rate_response {
        Some(r) => r,
        None => {
            return CodexRateLimitsResult {
                success: false,
                authenticated: false,
                account_id: None,
                plan_type: None,
                email: None,
                windows: vec![],
                raw_credits: None,
                error: Some("App-server did not return rate limits response".into()),
                provider_version: version,
            };
        }
    };

    // Check for error in rate limits
    if let Some(err) = rate_json.get("error") {
        let msg = err
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown app-server error");
        let is_auth = msg.contains("authentication required") || msg.contains("unauthenticated");
        return CodexRateLimitsResult {
            success: false,
            authenticated: !is_auth,
            account_id: None,
            plan_type: None,
            email: None,
            windows: vec![],
            raw_credits: None,
            error: Some(msg.to_string()),
            provider_version: version,
        };
    }

    // Try extracting email from account/read
    let mut detected_email = None;
    if let Some(acc) = account_response {
        if let Some(result) = acc.get("result") {
            if let Some(email) = result.get("email").and_then(|e| e.as_str()) {
                detected_email = Some(email.to_string());
            } else if let Some(account) = result.get("account") {
                if let Some(email) = account.get("email").and_then(|e| e.as_str()) {
                    detected_email = Some(email.to_string());
                }
            }
        }
    }

    // Parse rate limits result
    let result_obj = match rate_json.get("result") {
        Some(r) => r,
        None => {
            return CodexRateLimitsResult {
                success: false,
                authenticated: true,
                account_id: None,
                plan_type: None,
                email: detected_email,
                windows: vec![],
                raw_credits: None,
                error: Some("Response missing 'result' field".into()),
                provider_version: version,
            };
        }
    };

    let account_id = result_obj
        .get("accountId")
        .and_then(|a| a.as_str())
        .map(|s| s.to_string());

    let rate_limits = match result_obj.get("rateLimits") {
        Some(rl) => rl,
        None => {
            return CodexRateLimitsResult {
                success: true,
                authenticated: true,
                account_id,
                plan_type: None,
                email: detected_email,
                windows: vec![],
                raw_credits: None,
                error: Some("No rateLimits field in response".into()),
                provider_version: version,
            };
        }
    };

    let plan_type = rate_limits
        .get("planType")
        .and_then(|p| p.as_str())
        .map(|s| s.to_string());

    let credits = rate_limits.get("credits").cloned();

    let mut windows = Vec::new();

    // Parse Primary Window
    if let Some(primary) = rate_limits.get("primary") {
        if let Some(used_pct) = primary.get("usedPercent").and_then(|v| v.as_f64()) {
            let window_mins = primary.get("windowDurationMins").and_then(|v| v.as_i64());
            let resets_at = primary.get("resetsAt").and_then(|v| v.as_i64()).map(|ts| {
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| ts.to_string())
            });

            let name = match window_mins {
                Some(mins) if mins < 60 => format!("{}-minute window", mins),
                Some(mins) if mins % 60 == 0 => format!("{}-hour window", mins / 60),
                Some(mins) => format!("{}-minute window", mins),
                None => "Primary window".into(),
            };

            windows.push(CodexNormalizedWindow {
                name,
                window_type: "session".into(),
                used_percent: Some(used_pct),
                remaining_percent: Some((100.0 - used_pct).clamp(0.0, 100.0)),
                used: None,
                limit: None,
                reset_at: resets_at,
                window_duration_mins: window_mins,
                source: "official_app_server".into(),
            });
        }
    }

    // Parse Secondary Window
    if let Some(secondary) = rate_limits.get("secondary") {
        if let Some(used_pct) = secondary.get("usedPercent").and_then(|v| v.as_f64()) {
            let window_mins = secondary.get("windowDurationMins").and_then(|v| v.as_i64());
            let resets_at = secondary.get("resetsAt").and_then(|v| v.as_i64()).map(|ts| {
                chrono::DateTime::from_timestamp(ts, 0)
                    .map(|dt| dt.to_rfc3339())
                    .unwrap_or_else(|| ts.to_string())
            });

            let name = match window_mins {
                Some(mins) if mins == 10080 => "Weekly window".into(),
                Some(mins) if mins == 1440 => "Daily window".into(),
                Some(mins) if mins % 60 == 0 => format!("{}-hour window", mins / 60),
                Some(mins) => format!("{}-minute window", mins),
                None => "Secondary window".into(),
            };

            windows.push(CodexNormalizedWindow {
                name,
                window_type: "weekly".into(),
                used_percent: Some(used_pct),
                remaining_percent: Some((100.0 - used_pct).clamp(0.0, 100.0)),
                used: None,
                limit: None,
                reset_at: resets_at,
                window_duration_mins: window_mins,
                source: "official_app_server".into(),
            });
        }
    }

    // Parse rateLimitsByLimitId if present
    if let Some(by_id) = result_obj.get("rateLimitsByLimitId").and_then(|v| v.as_object()) {
        for (limit_id, snapshot) in by_id {
            if let Some(primary) = snapshot.get("primary") {
                if let Some(used_pct) = primary.get("usedPercent").and_then(|v| v.as_f64()) {
                    let window_mins = primary.get("windowDurationMins").and_then(|v| v.as_i64());
                    let resets_at = primary.get("resetsAt").and_then(|v| v.as_i64()).map(|ts| {
                        chrono::DateTime::from_timestamp(ts, 0)
                            .map(|dt| dt.to_rfc3339())
                            .unwrap_or_else(|| ts.to_string())
                    });

                    let limit_name = snapshot
                        .get("limitName")
                        .and_then(|n| n.as_str())
                        .unwrap_or(limit_id.as_str());

                    windows.push(CodexNormalizedWindow {
                        name: format!("{} quota", limit_name),
                        window_type: "custom".into(),
                        used_percent: Some(used_pct),
                        remaining_percent: Some((100.0 - used_pct).clamp(0.0, 100.0)),
                        used: None,
                        limit: None,
                        reset_at: resets_at,
                        window_duration_mins: window_mins,
                        source: "official_app_server".into(),
                    });
                }
            }
        }
    }

    CodexRateLimitsResult {
        success: true,
        authenticated: true,
        account_id,
        plan_type,
        email: detected_email,
        windows,
        raw_credits: credits,
        error: None,
        provider_version: version,
    }
}
