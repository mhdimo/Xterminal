// PTY Session Management
// Handles PTY spawning, reading, and lifecycle

use portable_pty::{native_pty_system, CommandBuilder, Child, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;
use uuid::Uuid;

/// Session information returned to frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionInfo {
    pub id: String,
    pub pid: u32,
    pub shell: String,
}

/// Options for spawning a PTY
#[derive(Debug, Deserialize, Clone)]
pub struct SpawnOptions {
    pub shell: Option<String>,
    pub cols: u16,
    pub rows: u16,
    pub env: Option<HashMap<String, String>>,
}

/// Internal PTY session
pub struct PtySession {
    #[allow(dead_code)] // Kept for debugging/logging purposes
    id: String,
    #[allow(dead_code)] // Kept to maintain child process lifecycle
    child: Box<dyn Child + Send>,
    pub master: Box<dyn MasterPty + Send>,
    writer: Mutex<Box<dyn Write + Send>>,
    reader_handle: JoinHandle<()>,
}

impl PtySession {
    pub fn new(
        id: String,
        child: Box<dyn Child + Send>,
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        reader_handle: JoinHandle<()>,
    ) -> Self {
        Self {
            id,
            child,
            master,
            writer: Mutex::new(writer),
            reader_handle,
        }
    }
}

/// PTY Manager - Manages all active PTY sessions
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
    app_handle: AppHandle,
}

impl PtyManager {
    /// Create a new PTY manager
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
        }
    }

    /// Spawn a new PTY session
    pub fn spawn(&self, options: SpawnOptions) -> Result<SessionInfo, String> {
        let id = Uuid::new_v4().to_string();

        // Detect default shell if not specified
        let shell = options.shell.unwrap_or_else(|| {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        });

        log::info!("Spawning PTY with shell: {}", shell);

        // Create PTY
        let pty_system = native_pty_system();
        let pty_size = PtySize {
            rows: options.rows,
            cols: options.cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        let pty_pair = pty_system
            .openpty(pty_size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        // Build command
        let mut cmd = CommandBuilder::new(&shell);

        // Set environment variables if provided
        if let Some(env) = options.env {
            for (key, value) in env {
                cmd.env(&key, &value);
            }
        }

        // Set default environment for terminal
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        // Spawn child process
        let child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        let pid = child.process_id().unwrap_or(0);

        log::info!("Spawned shell with PID: {}", pid);

        // Get the writer upfront - take_writer can only be called once
        let writer = pty_pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;

        // Start reader task
        let reader_handle = self.start_reader(&id, pty_pair.master.try_clone_reader().unwrap());

        // Store session with writer
        let session = PtySession::new(id.clone(), child, pty_pair.master, writer, reader_handle);
        self.sessions.lock().unwrap().insert(id.clone(), session);

        Ok(SessionInfo {
            id,
            pid,
            shell,
        })
    }

    /// Write data to a PTY session
    pub fn write(&self, session_id: &str, data: &str) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {}", session_id))?;

        // Lock the writer and write data
        let mut writer = session
            .writer
            .lock()
            .map_err(|e| format!("Failed to lock writer: {}", e))?;

        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;

        writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;

        Ok(())
    }

    /// Resize a PTY session
    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        let session = sessions
            .get(session_id)
            .ok_or_else(|| format!("Session not found: {}", session_id))?;

        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        session
            .master
            .resize(size)
            .map_err(|e| format!("Failed to resize PTY: {}", e))
    }

    /// Close a PTY session
    pub fn close(&self, session_id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        let session = sessions
            .remove(session_id)
            .ok_or_else(|| format!("Session not found: {}", session_id))?;

        log::info!("Closing session: {}", session_id);

        // Abort the reader task
        session.reader_handle.abort();

        // Note: MasterPty is automatically closed when dropped

        Ok(())
    }

    /// Start the reader task for a PTY session
    fn start_reader(&self, session_id: &str, mut reader: Box<dyn Read + Send>) -> JoinHandle<()> {
        let app_handle = self.app_handle.clone();
        let session_id = session_id.to_string();

        tokio::spawn(async move {
            let mut buffer = [0u8; 8192];

            log::info!("Starting reader for session: {}", session_id);

            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF - shell exited normally
                        log::info!("Session {} EOF - shell exited", session_id);
                        let event_name = format!("pty://{}/exit", session_id);
                        let _ = app_handle.emit(
                            event_name.as_str(),
                            serde_json::json!({ "exitCode": 0 }),
                        );
                        break;
                    }
                    Ok(n) => {
                        // Convert bytes to string (lossy conversion for invalid UTF-8)
                        let data = String::from_utf8_lossy(&buffer[..n]).to_string();

                        // Emit data event to frontend
                        let event_name = format!("pty://{}/data", session_id);
                        let _ = app_handle.emit(
                            event_name.as_str(),
                            data,
                        );
                    }
                    Err(e) => {
                        log::error!("Error reading from PTY {}: {}", session_id, e);
                        let event_name = format!("pty://{}/exit", session_id);
                        let _ = app_handle.emit(
                            event_name.as_str(),
                            serde_json::json!({ "exitCode": 1 }),
                        );
                        break;
                    }
                }
            }

            log::info!("Reader task ended for session: {}", session_id);
        })
    }
}
