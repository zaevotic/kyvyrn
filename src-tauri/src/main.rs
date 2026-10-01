use commands::configs::{AppConfig, AppRegistry, Engine};
use std::collections::HashMap;
use std::sync::Mutex;

mod commands;
mod utils;
mod net;
mod cli;

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // 0. Handle CLI package manager commands (install, list, rm, launch, info, config, etc.)
    if let Some(exit_code) = cli::handle_cli(&args) {
        std::process::exit(exit_code);
    }

    // 1. Check if launched in standalone app mode by ID
    if let Some(pos) = args.iter().position(|a| a == "--launch-app") {
        if let Some(app_id) = args.get(pos + 1) {
            launch_standalone_app_by_id(app_id);
            return;
        }
    }

    // 2. Check if launched with standalone URL
    if let Some(pos) = args.iter().position(|a| a == "--launch-url") {
        if let Some(url) = args.get(pos + 1) {
            let title = args.get(pos + 2).cloned().unwrap_or_else(|| "App".to_string());
            launch_standalone_url(url, &title);
            return;
        }
    }

    // 3. Check if executing directly from an app directory as a deployed runner
    let current_exe = std::env::current_exe().ok();
    let current_dir = current_exe.as_ref().and_then(|p| p.parent().map(|p| p.to_path_buf()));
    if let Some(app_dir) = current_dir {
        let config_path = app_dir.join("config.json");
        let is_runner_bin = current_exe
            .as_ref()
            .and_then(|e| e.file_name())
            .map_or(false, |n| n == "runner" || n == "kyvyrn-runner");

        if config_path.exists() && (is_runner_bin || app_dir.join("webkit_data").exists() || app_dir.join("profile").exists()) {
            if let Ok(config) = commands::configs::load_config(&config_path) {
                match &config.engine {
                    Engine::Chromium { browser } => {
                        let _ = commands::chromium::open_chromium_app_window(
                            Some(config.id),
                            config.name,
                            config.url,
                            Some(browser.clone())
                        );
                        return;
                    }
                    Engine::WebKit => {
                        run_webkit_window(config, app_dir);
                        return;
                    }
                }
            }
        }
    }

    tauri::Builder
        ::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let global_cfg = commands::global_config::load_global_config().unwrap_or_default();
            tauri::WebviewWindowBuilder::new(
                app.handle(),
                "main",
                tauri::WebviewUrl::default()
            )
            .title("Kyvyrn")
            .inner_size(1200.0, 800.0)
            .resizable(true)
            .decorations(global_cfg.titlebar)
            .build()?;
            Ok(())
        })
        .invoke_handler(
            tauri::generate_handler![
                commands::webview::open_app_window,
                commands::chromium::open_chromium_app_window,
                commands::icons::fetch_site_icon,
                commands::icons::save_app_icon,
                commands::icons::get_app_icon_path,
                commands::icons::get_icon_bytes,
                commands::icons::refresh_site_icon,
                utils::browser::detect_chromium_browsers,
                commands::configs::load_apps,
                commands::configs::save_app,
                commands::configs::update_app,
                commands::configs::update_app_config,
                commands::configs::delete_app,
                commands::global_config::load_global_config,
                commands::global_config::save_global_config,
                commands::global_config::set_window_decorations
            ]
        )
        .manage(AppRegistry {
            apps: Mutex::new(HashMap::new()),
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}

fn launch_standalone_app_by_id(app_id: &str) {
    let app_dir = match utils::paths::app_dir_by_id(app_id) {
        Ok(dir) => dir,
        Err(e) => {
            eprintln!("App with id '{}' not found: {}", app_id, e);
            return;
        }
    };

    let config_path = app_dir.join("config.json");
    let config: AppConfig = match commands::configs::load_config(&config_path) {
        Ok(cfg) => cfg,
        Err(e) => {
            eprintln!("Failed to load app config: {}", e);
            return;
        }
    };

    match &config.engine {
        Engine::Chromium { browser } => {
            let _ = commands::chromium::open_chromium_app_window(
                Some(config.id),
                config.name,
                config.url,
                Some(browser.clone())
            );
        }
        Engine::WebKit => {
            run_webkit_window(config, app_dir);
        }
    }
}

pub(crate) fn run_webkit_window(config: AppConfig, app_dir: std::path::PathBuf) {
    let app_id = config.id.clone();
    let app_name = config.name.clone();
    let raw_url = config.url.clone();

    tauri::Builder::default()
        .setup(move |app| {
            let webkit_data = app_dir.join("webkit_data");
            let _ = std::fs::create_dir_all(&webkit_data);

            let final_url_str = utils::url::normalize_url(raw_url).map_err(|e| e.to_string())?;
            let parsed_url: url::Url = final_url_str.parse().map_err(|e: url::ParseError| e.to_string())?;

            let icon_file = utils::paths::icon_path(&app_id);
            let mut icon_opt: Option<tauri::image::Image> = None;
            if icon_file.exists() {
                if let Ok(icon_bytes) = std::fs::read(&icon_file) {
                    if let Ok(img) = image::load_from_memory(&icon_bytes) {
                        let rgba = img.to_rgba8();
                        let (width, height) = rgba.dimensions();
                        icon_opt = Some(tauri::image::Image::new_owned(rgba.into_raw(), width, height));
                    }
                }
            }

            let show_titlebar = config.titlebar.unwrap_or_else(|| {
                commands::global_config::load_global_config().map(|g| g.titlebar).unwrap_or(true)
            });

            let mut builder = tauri::WebviewWindowBuilder::new(
                app.handle(),
                format!("app_{}", app_id),
                tauri::WebviewUrl::External(parsed_url)
            )
            .title(&app_name)
            .inner_size(1200.0, 800.0)
            .resizable(true)
            .decorations(show_titlebar)
            .data_directory(webkit_data)
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Allow);

            if let Some(icon) = icon_opt {
                builder = builder.icon(icon)?;
            }

            builder.build().map_err(|e| e.to_string())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running standalone webkit app");
}

fn launch_standalone_url(url: &str, title: &str) {
    let url_str = url.to_string();
    let title_str = title.to_string();

    tauri::Builder::default()
        .setup(move |app| {
            let final_url = utils::url::normalize_url(url_str).map_err(|e| e.to_string())?;
            let builder = tauri::WebviewWindowBuilder::new(
                app.handle(),
                "standalone_window",
                tauri::WebviewUrl::External(final_url.parse().map_err(|e: url::ParseError| e.to_string())?)
            )
            .title(&title_str)
            .inner_size(1200.0, 800.0)
            .resizable(true)
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Allow);

            builder.build().map_err(|e| e.to_string())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running standalone url");
}
