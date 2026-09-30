use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Clone)]
struct AppConfig {
    #[serde(default)]
    id: String,
    name: String,
    url: String,
    #[serde(default)]
    titlebar: Option<bool>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GlobalConfig {
    #[serde(default = "default_titlebar")]
    titlebar: bool,
}

fn default_titlebar() -> bool {
    true
}

fn load_global_titlebar() -> bool {
    if let Some(config_dir) = dirs::config_dir() {
        let global_path = config_dir.join("kyvyrn/config.json");
        if let Ok(data) = std::fs::read_to_string(global_path) {
            if let Ok(cfg) = serde_json::from_str::<GlobalConfig>(&data) {
                return cfg.titlebar;
            }
        }
    }
    true
}

fn normalize_url(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let current_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));

    let mut config_path = current_dir.join("config.json");
    let mut custom_url: Option<String> = None;
    let mut custom_title: Option<String> = None;

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--config" => {
                if let Some(p) = args.get(i + 1) {
                    config_path = PathBuf::from(p);
                    i += 1;
                }
            }
            "--url" => {
                if let Some(u) = args.get(i + 1) {
                    custom_url = Some(u.clone());
                    i += 1;
                }
            }
            "--title" => {
                if let Some(t) = args.get(i + 1) {
                    custom_title = Some(t.clone());
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }

    let (app_id, app_name, app_url, webkit_data_dir, icon_path, show_titlebar) = if let Some(url) = custom_url {
        let title = custom_title.unwrap_or_else(|| "Web App".to_string());
        let data_dir = current_dir.join("webkit_data");
        let titlebar = load_global_titlebar();
        ("standalone".to_string(), title, url, data_dir, None, titlebar)
    } else if config_path.exists() {
        let data = match std::fs::read_to_string(&config_path) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Failed to read config file at {:?}: {}", config_path, e);
                std::process::exit(1);
            }
        };
        let cfg: AppConfig = match serde_json::from_str(&data) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("Failed to parse config.json: {}", e);
                std::process::exit(1);
            }
        };
        let base_dir = config_path.parent().unwrap_or(&current_dir);
        let data_dir = base_dir.join("webkit_data");

        let local_icon = base_dir.join("icon.png");
        let xdg_icon = dirs::data_dir().map(|d| d.join("kyvyrn/icons").join(format!("{}.png", cfg.id)));
        let icon = if local_icon.exists() {
            Some(local_icon)
        } else if let Some(ref xi) = xdg_icon {
            if xi.exists() { Some(xi.clone()) } else { None }
        } else {
            None
        };

        let titlebar = cfg.titlebar.unwrap_or_else(load_global_titlebar);
        (cfg.id, cfg.name, cfg.url, data_dir, icon, titlebar)
    } else {
        eprintln!("No config.json found in {:?} and no --url provided.", current_dir);
        std::process::exit(1);
    };

    let _ = std::fs::create_dir_all(&webkit_data_dir);
    let final_url_str = normalize_url(&app_url);
    let parsed_url: url::Url = final_url_str.parse().expect("Invalid URL");

    tauri::Builder::default()
        .setup(move |app| {
            let mut icon_opt: Option<tauri::image::Image> = None;
            if let Some(ref icon_file) = icon_path {
                if let Ok(icon_bytes) = std::fs::read(icon_file) {
                    if let Ok(img) = image::load_from_memory(&icon_bytes) {
                        let rgba = img.to_rgba8();
                        let (width, height) = rgba.dimensions();
                        icon_opt = Some(tauri::image::Image::new_owned(rgba.into_raw(), width, height));
                    }
                }
            }

            let mut builder = tauri::WebviewWindowBuilder::new(
                app.handle(),
                format!("app_{}", app_id),
                tauri::WebviewUrl::External(parsed_url)
            )
            .title(&app_name)
            .inner_size(1200.0, 800.0)
            .resizable(true)
            .decorations(show_titlebar)
            .data_directory(webkit_data_dir)
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
