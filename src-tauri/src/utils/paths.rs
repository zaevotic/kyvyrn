use std::path::PathBuf;

pub fn applications_dir() -> PathBuf {
    dirs::data_dir().expect("No data dir").join("applications")
}

pub fn desktop_entry_path(id: &str) -> PathBuf {
    applications_dir().join(format!("kyvyrn-{}.desktop", id))
}

pub fn icon_path(id: &str) -> PathBuf {
    dirs::data_dir().expect("No data dir").join("kyvyrn").join("icons").join(format!("{}.png", id))
}

pub fn app_profile_dir(folder: &str) -> PathBuf {
    app_dir(folder).join("profile")
}

pub fn app_webkit_data_dir(folder: &str) -> PathBuf {
    app_dir(folder).join("webkit_data")
}

pub fn global_config_path() -> std::path::PathBuf {
    let base = dirs::config_dir().expect("No config dir").join("kyvyrn");

    std::fs::create_dir_all(&base).ok();
    base.join("config.json")
}

pub fn apps_dir() -> PathBuf {
    dirs::data_dir().expect("No data dir").join("kyvyrn").join("Apps")
}

pub fn app_dir_by_id(id: &str) -> Result<PathBuf, String> {
    let base = apps_dir();

    for entry in std::fs::read_dir(&base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().join("config.json");

        if path.exists() {
            let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let cfg: crate::commands::configs::AppConfig = serde_json
                ::from_str(&data)
                .map_err(|e| e.to_string())?;

            if cfg.id == id {
                return Ok(entry.path());
            }
        }
    }

    Err("App not found".into())
}

pub fn rename_app_folder(
    id: &str,
    _old_name: &str, // no longer needed
    new_name: &str
) -> Result<(), String> {
    let app_dir = app_dir_by_id(id)?;
    let parent = app_dir.parent().ok_or("Invalid app dir")?;

    let new_folder = generate_app_folder(new_name, id);
    let new_path = parent.join(new_folder);

    std::fs::rename(&app_dir, &new_path).map_err(|e| e.to_string())?;

    Ok(())
}

// internal helper
fn safe_app_name(name: &str) -> String {
    let mut prev_dash = false;

    name.chars()
        .filter_map(|c| {
            if c.is_ascii_alphanumeric() {
                prev_dash = false;
                Some(c.to_ascii_lowercase())
            } else if !prev_dash {
                prev_dash = true;
                Some('-')
            } else {
                None
            }
        })
        .collect()
}

// called ONLY ONCE, during creation
pub fn generate_app_folder(name: &str, id: &str) -> String {
    format!("{}-{}", safe_app_name(name), id)
}

// dumb path joiner — NO LOGIC HERE
pub fn app_dir(folder: &str) -> PathBuf {
    apps_dir().join(folder)
}
