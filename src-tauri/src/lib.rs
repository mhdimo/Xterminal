// Xterminal - Windows Terminal-inspired terminal emulator for Linux

mod commands;
mod pty;

use commands::{spawn_pty, pty_write, pty_resize, pty_close, get_hostname};
use pty::PtyManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Initialize PTY manager
            let pty_manager = PtyManager::new(app.handle().clone());
            app.manage(pty_manager);

            // Setup logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            log::info!("Xterminal starting up...");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            spawn_pty,
            pty_write,
            pty_resize,
            pty_close,
            get_hostname,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
