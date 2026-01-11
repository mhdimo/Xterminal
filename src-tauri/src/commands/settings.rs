// Settings persistence commands
// Handles loading and saving settings to disk

use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// Get the settings file path
fn get_settings_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;
    
    let app_config_dir = config_dir.join("xterminal");
    
    // Create directory if it doesn't exist
    if !app_config_dir.exists() {
        fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    Ok(app_config_dir.join("settings.json"))
}

/// Get the window state file path
fn get_window_state_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;
    
    let app_config_dir = config_dir.join("xterminal");
    
    if !app_config_dir.exists() {
        fs::create_dir_all(&app_config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    
    Ok(app_config_dir.join("window-state.json"))
}

/// Load settings from disk
#[tauri::command]
pub fn load_settings() -> Result<Option<Value>, String> {
    let path = get_settings_path()?;
    
    if !path.exists() {
        log::info!("No settings file found, using defaults");
        return Ok(None);
    }
    
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;
    
    let settings: Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;
    
    log::info!("Loaded settings from {:?}", path);
    Ok(Some(settings))
}

/// Save settings to disk
#[tauri::command]
pub fn save_settings(settings: Value) -> Result<(), String> {
    let path = get_settings_path()?;
    
    let contents = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write settings: {}", e))?;
    
    log::info!("Saved settings to {:?}", path);
    Ok(())
}

/// Load window state from disk
#[tauri::command]
pub fn load_window_state() -> Result<Option<Value>, String> {
    let path = get_window_state_path()?;
    
    if !path.exists() {
        return Ok(None);
    }
    
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read window state: {}", e))?;
    
    let state: Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse window state: {}", e))?;
    
    Ok(Some(state))
}

/// Save window state to disk
#[tauri::command]
pub fn save_window_state(state: Value) -> Result<(), String> {
    let path = get_window_state_path()?;
    
    let contents = serde_json::to_string_pretty(&state)
        .map_err(|e| format!("Failed to serialize window state: {}", e))?;
    
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write window state: {}", e))?;
    
    Ok(())
}
