use serde::{ Serialize, Deserialize };
use std::fs;

use crate::utils::paths::global_config_path;
use crate::commands::configs::Engine;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalAppConfig {
    pub view_mode: String,
    pub theme: String,
    pub default_engine: Engine,
    #[serde(default = "default_titlebar")]
    pub titlebar: bool,
}

fn default_titlebar() -> bool {
    true
}

impl Default for GlobalAppConfig {
    fn default() -> Self {
        Self {
            view_mode: "grid".to_string(),
            theme: "dark".to_string(),
            default_engine: Engine::WebKit,
            titlebar: true,
        }
    }
}

#[tauri::command]
pub fn load_global_config() -> Result<GlobalAppConfig, String> {
    let path = global_config_path();

    if !path.exists() {
        let cfg = GlobalAppConfig::default();
        save_global_config(cfg.clone())?;
        return Ok(cfg);
    }

    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_global_config(config: GlobalAppConfig) -> Result<(), String> {
    let path = global_config_path();

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_window_decorations(window: tauri::Window, decorations: bool) -> Result<(), String> {
    window.set_decorations(decorations).map_err(|e| e.to_string())
}
