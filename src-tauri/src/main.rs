// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    {
        // Fix for WebKitWebProcess crash (SIGABRT Signal 6) on Wayland (Hyprland, Sway, etc.)
        // and modern Mesa/NVIDIA drivers where the WebKitGTK DMA-BUF renderer fails.
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    tokenly_lib::run()
}
