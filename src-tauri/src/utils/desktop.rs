use std::fs;
use std::path::PathBuf;
use crate::commands::configs::{AppConfig, Engine};
use crate::utils::paths::{applications_dir, desktop_entry_path, icon_path, app_profile_dir};
use crate::utils::url::normalize_url;
use crate::utils::browser::detect_chromium_browser;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub fn find_runner_source() -> Option<PathBuf> {
    let candidates = [
        PathBuf::from("/usr/lib/kyvyrn/kyvyrn-runner"),
        PathBuf::from("/usr/bin/kyvyrn-runner"),
    ];

    for c in &candidates {
        if c.exists() {
            return Some(c.clone());
        }
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            let adjacent = parent.join("kyvyrn-runner");
            if adjacent.exists() {
                return Some(adjacent);
            }
        }
        return Some(current_exe);
    }

    None
}

pub fn deploy_runner_binary(app_folder: &str) -> Result<PathBuf, String> {
    let app_dir = crate::utils::paths::app_dir(app_folder);
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let target_runner = app_dir.join("runner");
    if let Some(src) = find_runner_source() {
        let should_copy = if target_runner.exists() {
            let src_meta = fs::metadata(&src).ok();
            let target_meta = fs::metadata(&target_runner).ok();
            match (src_meta, target_meta) {
                (Some(s), Some(t)) => s.len() != t.len() || s.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH) > t.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH),
                _ => true,
            }
        } else {
            true
        };

        if should_copy {
            fs::copy(&src, &target_runner).map_err(|e| e.to_string())?;
            #[cfg(unix)]
            {
                let mut perms = fs::metadata(&target_runner).map_err(|e| e.to_string())?.permissions();
                perms.set_mode(0o755);
                fs::set_permissions(&target_runner, perms).map_err(|e| e.to_string())?;
            }
        }
        return Ok(target_runner);
    }

    Err("No runner binary source found".to_string())
}

pub fn write_desktop_entry(app: &AppConfig) -> Result<PathBuf, String> {
    let apps_dir = applications_dir();
    fs::create_dir_all(&apps_dir).map_err(|e| e.to_string())?;

    let entry_path = desktop_entry_path(&app.id);
    let icon_file = icon_path(&app.id);
    let normalized_url = normalize_url(app.url.clone()).unwrap_or_else(|_| app.url.clone());

    let (exec_cmd, wm_class) = match &app.engine {
        Engine::Chromium { browser } => {
            let browser_cmd = if !browser.is_empty() {
                browser.clone()
            } else {
                detect_chromium_browser().unwrap_or_else(|_| "chromium".to_string())
            };
            let profile_dir = app_profile_dir(&app.folder);
            fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

            let exec = format!(
                "{} --app=\"{}\" --user-data-dir=\"{}\" --class=\"{}\"",
                browser_cmd,
                normalized_url,
                profile_dir.display(),
                app.name
            );
            (exec, app.name.clone())
        }
        Engine::WebKit => {
            let runner_path = deploy_runner_binary(&app.folder)
                .unwrap_or_else(|_| {
                    std::env::current_exe()
                        .unwrap_or_else(|_| PathBuf::from("kyvyrn"))
                });
            let exec = format!("\"{}\"", runner_path.display());
            (exec, app.name.clone())
        }
    };

    let comment = if app.description.is_empty() {
        &app.name
    } else {
        &app.description
    };

    let content = format!(
        "[Desktop Entry]\n\
         Version=1.0\n\
         Type=Application\n\
         Name={}\n\
         Comment={}\n\
         Exec={}\n\
         Icon={}\n\
         Terminal=false\n\
         StartupWMClass={}\n\
         Categories=Network;WebBrowser;\n",
        app.name,
        comment,
        exec_cmd,
        icon_file.display(),
        wm_class
    );

    let tmp = entry_path.with_extension("tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(tmp, &entry_path).map_err(|e| e.to_string())?;

    Ok(entry_path)
}

pub fn remove_desktop_entry(app_id: &str) -> Result<(), String> {
    let entry_path = desktop_entry_path(app_id);
    if entry_path.exists() {
        fs::remove_file(entry_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
