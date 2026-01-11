// Tauri commands for PTY operations
// These commands are called from the frontend via Tauri IPC

use crate::pty::{PtyManager, SessionInfo, SpawnOptions};
use tauri::State;

/// Spawn a new PTY session
///
/// # Arguments
/// * `options` - Spawn options including shell, columns, rows, and environment variables
///
/// # Returns
/// Session information including ID, PID, and shell path
#[tauri::command]
pub async fn spawn_pty(
    options: SpawnOptions,
    manager: State<'_, PtyManager>,
) -> Result<SessionInfo, String> {
    log::info!("spawn_pty called with options: {:?}", options);
    manager.spawn(options)
}

/// Write data to a PTY session
///
/// # Arguments
/// * `session_id` - The ID of the session to write to
/// * `data` - The data string to write to the PTY
#[tauri::command]
pub async fn pty_write(
    session_id: String,
    data: String,
    manager: State<'_, PtyManager>,
) -> Result<(), String> {
    manager.write(&session_id, &data)
}

/// Resize a PTY session
///
/// # Arguments
/// * `session_id` - The ID of the session to resize
/// * `cols` - New number of columns
/// * `rows` - New number of rows
#[tauri::command]
pub async fn pty_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    manager: State<'_, PtyManager>,
) -> Result<(), String> {
    log::debug!("pty_resize: {} to {}x{}", session_id, cols, rows);
    manager.resize(&session_id, cols, rows)
}

/// Close a PTY session
///
/// # Arguments
/// * `session_id` - The ID of the session to close
#[tauri::command]
pub async fn pty_close(
    session_id: String,
    manager: State<'_, PtyManager>,
) -> Result<(), String> {
    log::info!("pty_close: {}", session_id);
    manager.close(&session_id)
}
