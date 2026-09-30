use std::process::Command;
use crate::utils::url::normalize_url;
use crate::utils::browser::detect_chromium_browser;
use crate::utils::paths::{app_dir_by_id, apps_dir};

#[tauri::command]
pub fn open_chromium_app_window(
    id: Option<String>,
    title: String,
    url: String,
    browser: Option<String>
) -> Result<(), String> {
    let final_url = normalize_url(url)?;

    let profile_dir = if let Some(app_id) = &id {
        if let Ok(app_dir) = app_dir_by_id(app_id) {
            app_dir.join("profile")
        } else {
            apps_dir().join(&title).join("profile")
        }
    } else {
        apps_dir().join(&title).join("profile")
    };

    std::fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

    let browser_cmd = browser.filter(|b| !b.is_empty()).unwrap_or(detect_chromium_browser()?);

    Command::new(browser_cmd)
        .arg(format!("--app={}", final_url))
        .arg(format!("--user-data-dir={}", profile_dir.display()))
        .arg(format!("--class={}", title))
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
