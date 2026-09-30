use serde::{ Serialize, Deserialize };
use std::collections::HashMap;
use std::sync::Mutex;
use std::fs;

use crate::utils::paths::{ app_dir, generate_app_folder };
use crate::utils::paths::{ app_dir_by_id, rename_app_folder };

pub struct AppRegistry {
    pub apps: Mutex<HashMap<String, AppConfig>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind")]
pub enum Engine {
    #[serde(rename = "webkit")]
    WebKit,
    #[serde(rename = "chromium")] Chromium {
        browser: String,
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub description: String,
    pub created_at: u64,
    pub engine: Engine,
    pub folder: String,
    #[serde(default)]
    pub titlebar: Option<bool>,
}

#[tauri::command]
pub fn load_apps(state: tauri::State<AppRegistry>) -> Result<Vec<AppConfig>, String> {
    let base = crate::utils::paths::apps_dir();
    fs::create_dir_all(&base).map_err(|e| e.to_string())?;

    let mut registry = state.apps.lock().unwrap();
    registry.clear();

    for entry in fs::read_dir(base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().join("config.json");

        if path.exists() {
            let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(app) = serde_json::from_str::<AppConfig>(&data) {
                // Ensure desktop entry exists and is synced
                let _ = crate::utils::desktop::write_desktop_entry(&app);
                registry.insert(app.id.clone(), app);
            }
        }
    }

    Ok(registry.values().cloned().collect())
}

#[tauri::command]
pub fn update_app(app: AppConfig, state: tauri::State<AppRegistry>) -> Result<(), String> {
    let dir = app_dir(&app.folder);
    let path = dir.join("config.json");

    let json = serde_json::to_string_pretty(&app).map_err(|e| e.to_string())?;

    let tmp = path.with_extension("tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(tmp, path).map_err(|e| e.to_string())?;

    let _ = crate::utils::desktop::write_desktop_entry(&app);

    state.apps.lock().unwrap().insert(app.id.clone(), app);
    Ok(())
}

#[tauri::command]
pub fn update_app_config(
    id: String,
    name: String,
    url: String,
    engine: Engine
) -> Result<(), String> {
    // Load config using current folder
    let mut app_dir = app_dir_by_id(&id)?;
    let mut config_path = app_dir.join("config.json");

    let mut config = load_config(&config_path)?;

    // Rename folder if name changed
    if config.name != name {
        rename_app_folder(&id, &config.name, &name)?;
        config.name = name;

        // Recompute paths after rename
        app_dir = app_dir_by_id(&id)?;
        config_path = app_dir.join("config.json");
    }

    config.url = url;
    config.engine = engine;

    save_config(&config_path, &config)?;

    let _ = crate::utils::desktop::write_desktop_entry(&config);

    Ok(())
}

#[tauri::command]
pub fn delete_app(id: String) -> Result<(), String> {
    let app_dir = app_dir_by_id(&id)?;
    std::fs::remove_dir_all(&app_dir).map_err(|e| e.to_string())?;

    // Remove desktop entry and icon
    let _ = crate::utils::desktop::remove_desktop_entry(&id);
    let icon_file = crate::utils::paths::icon_path(&id);
    if icon_file.exists() {
        let _ = std::fs::remove_file(icon_file);
    }

    Ok(())
}

#[tauri::command]
pub fn save_app(mut app: AppConfig, state: tauri::State<AppRegistry>) -> Result<(), String> {
    let folder = generate_app_folder(&app.name, &app.id);
    app.folder = folder;

    let dir = app_dir(&app.folder);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Prepare profile directory based on engine
    match &app.engine {
        Engine::Chromium { .. } => {
            fs::create_dir_all(crate::utils::paths::app_profile_dir(&app.folder)).ok();
        }
        Engine::WebKit => {
            fs::create_dir_all(crate::utils::paths::app_webkit_data_dir(&app.folder)).ok();
        }
    }

    let json = serde_json::to_string_pretty(&app).map_err(|e| e.to_string())?;
    fs::write(dir.join("config.json"), json).map_err(|e| e.to_string())?;

    // Create .desktop entry for system app launchers
    let _ = crate::utils::desktop::write_desktop_entry(&app);

    state.apps.lock().unwrap().insert(app.id.clone(), app);
    Ok(())
}

pub fn load_config(path: &std::path::Path) -> Result<AppConfig, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;

    serde_json::from_str(&data).map_err(|e| e.to_string())
}

pub fn save_config(path: &std::path::Path, app: &AppConfig) -> Result<(), String> {
    let json = serde_json::to_string_pretty(app).map_err(|e| e.to_string())?;

    let tmp = path.with_extension("tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    fs::rename(tmp, path).map_err(|e| e.to_string())?;

    Ok(())
}
