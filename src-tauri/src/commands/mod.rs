// Tauri commands module

pub mod pty;

pub use pty::{spawn_pty, pty_write, pty_resize, pty_close};

#[tauri::command]
pub fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Terminal".to_string())
}
