// Tauri commands module

pub mod pty;
pub mod settings;

pub use pty::{spawn_pty, pty_write, pty_resize, pty_close};
pub use settings::{load_settings, save_settings, load_window_state, save_window_state};

#[tauri::command]
pub fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Terminal".to_string())
}
