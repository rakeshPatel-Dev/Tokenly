pub mod antigravity;
pub mod codex;
pub mod commands;
pub mod db;
pub mod scheduler;

use std::sync::Arc;

use db::DbState;
use scheduler::SchedulerHandle;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }
    let db_state = DbState::new().expect("Failed to initialize SQLite database");

    // Share the connection with the background scheduler via an Arc
    let shared_conn = Arc::clone(&db_state.conn);

    // Spawn the background refresh scheduler — it lives on its own thread
    // and keeps running even when the window is hidden or closed to tray.
    let scheduler_handle = scheduler::spawn(shared_conn);

    tauri::Builder::default()
        // Shared state
        .manage(db_state)
        .manage(scheduler_handle)
        // Plugins
        .plugin(tauri_plugin_opener::init())
        // All IPC commands
        .invoke_handler(tauri::generate_handler![
            commands::list_accounts,
            commands::save_account,
            commands::delete_account,
            commands::get_latest_usage,
            commands::get_usage_history,
            commands::detect_providers,
            commands::query_codex,
            commands::query_antigravity,
            commands::refresh_account,
            commands::refresh_all_accounts,
            commands::get_setting,
            commands::set_setting,
            commands::set_window_visible,
            commands::set_refresh_intervals,
        ])
        // System tray setup
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id("show", "Show Tokenly").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("Tokenly — AI quota tracker")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            // Tell scheduler we're in foreground mode
                            if let Some(sched) = app.try_state::<SchedulerHandle>() {
                                sched.set_window_visible(true);
                            }
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Left-click on tray icon toggles the window
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                                if let Some(sched) = app.try_state::<SchedulerHandle>() {
                                    sched.set_window_visible(false);
                                }
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                                if let Some(sched) = app.try_state::<SchedulerHandle>() {
                                    sched.set_window_visible(true);
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // Intercept the close button: hide to tray instead of quitting
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the default close (which would destroy the window)
                api.prevent_close();
                let _ = window.hide();
                // Switch scheduler to background interval
                if let Some(sched) = window.app_handle().try_state::<SchedulerHandle>() {
                    sched.set_window_visible(false);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backend_subsystems() {
        let db_state = DbState::new().expect("Failed to initialize SQLite DB");
        let conn = db_state.conn.lock().unwrap();
        let accounts = db::list_accounts(&conn).expect("Failed to query accounts");
        println!("Loaded accounts: {}", accounts.len());

        let agy = antigravity::query_antigravity_usage(None);
        println!("Agy query: success={}, windows={}", agy.success, agy.windows.len());

        let codex = codex::query_codex_rate_limits(None);
        println!("Codex query: success={}, err={:?}", codex.success, codex.error);
    }
}
