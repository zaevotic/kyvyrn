#[tauri::command]
pub fn open_app_window(
    id: Option<String>,
    _label: Option<String>,
    title: Option<String>,
    url: Option<String>
) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;

    if let Some(app_id) = id {
        if let Ok(app_dir) = crate::utils::paths::app_dir_by_id(&app_id) {
            let runner_path = app_dir.join("runner");
            if runner_path.exists() {
                std::process::Command::new(runner_path)
                    .spawn()
                    .map_err(|e| e.to_string())?;
                return Ok(());
            }
        }

        std::process::Command::new(current_exe)
            .arg("--launch-app")
            .arg(&app_id)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    if let (Some(t), Some(u)) = (title, url) {
        std::process::Command::new(current_exe)
            .arg("--launch-url")
            .arg(&u)
            .arg(&t)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
