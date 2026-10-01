use std::path::PathBuf;
use std::time::SystemTime;
use crate::commands::configs::{AppConfig, Engine, list_all_configs, save_config};
use crate::commands::global_config::{load_global_config, save_global_config};
use crate::utils::paths::{app_dir, generate_app_folder, icon_path, app_dir_by_id};
use crate::utils::desktop::{write_desktop_entry, remove_desktop_entry, deploy_runner_binary};
use crate::utils::url::normalize_url;

pub fn handle_cli(args: &[String]) -> Option<i32> {
    if args.len() <= 1 {
        return None;
    }

    let cmd = args[1].as_str();

    // Skip internal Tauri / standalone flags to let main.rs handle them
    if cmd.starts_with("--launch-") {
        return None;
    }

    match cmd {
        "install" | "add" | "-i" => {
            Some(cmd_install(&args[2..]))
        }
        "list" | "ls" | "-l" => {
            Some(cmd_list(&args[2..]))
        }
        "rm" | "remove" | "uninstall" | "-r" => {
            Some(cmd_remove(&args[2..]))
        }
        "launch" | "run" | "open" => {
            Some(cmd_launch(&args[2..]))
        }
        "info" => {
            Some(cmd_info(&args[2..]))
        }
        "config" => {
            Some(cmd_config(&args[2..]))
        }
        "help" | "--help" | "-h" => {
            print_help();
            Some(0)
        }
        "version" | "--version" | "-v" => {
            println!("kyvyrn {}", env!("CARGO_PKG_VERSION"));
            Some(0)
        }
        _ => {
            // Check if user passed a URL directly as first arg
            if cmd.starts_with("http://") || cmd.starts_with("https://") {
                Some(cmd_install(&args[1..]))
            } else {
                eprintln!("Unknown command: '{}'. Run 'kyvyrn --help' for usage.", cmd);
                Some(1)
            }
        }
    }
}

fn print_help() {
    println!(r#"kyvyrn - Lightweight Linux Web App Manager & Runner

USAGE:
    kyvyrn [COMMAND] [OPTIONS]

COMMANDS:
    install, add, -i <URL>     Install a new web application
    list, ls, -l               List all installed web applications
    rm, remove, -r <NAME|ID>   Remove an installed web application
    launch, run <NAME|ID>      Launch a web application
    info <NAME|ID>             Show details for an application
    config [KEY] [VALUE]       View or update global settings
    help, -h                   Show this help message
    version, -v                Show version

INSTALL OPTIONS:
    -n, --name <NAME>          Application display name (default: auto from domain)
    -e, --engine <ENGINE>      Engine: 'webkit' (default) or 'chromium'
    -b, --browser <BROWSER>    Chromium binary (e.g. 'brave', 'google-chrome', 'chromium')
    -i, --icon <PATH>          Path to custom icon file
    --titlebar <show|hide>     Window titlebar decoration (default: inherits global)
    --no-titlebar              Shorthand for --titlebar hide

EXAMPLES:
    kyvyrn install https://chatgpt.com --name "ChatGPT"
    kyvyrn -i https://web.whatsapp.com -n "WhatsApp" -e chromium -b brave
    kyvyrn list
    kyvyrn launch chatgpt
    kyvyrn rm chatgpt
    kyvyrn config titlebar hide
"#);
}

fn cmd_list(_args: &[String]) -> i32 {
    match list_all_configs() {
        Ok(apps) => {
            if apps.is_empty() {
                println!("No web applications installed.");
                println!("Install one with: kyvyrn install <URL>");
                return 0;
            }

            println!("{:<16}  {:<20}  {:<18}  {:<10}  {}", "ID", "NAME", "ENGINE", "TITLEBAR", "URL");
            println!("{}", "─".repeat(88));

            for app in &apps {
                let engine_str = match &app.engine {
                    Engine::WebKit => "WebKit".to_string(),
                    Engine::Chromium { browser } => {
                        if browser.is_empty() {
                            "Chromium".to_string()
                        } else {
                            format!("Chromium ({})", browser)
                        }
                    }
                };

                let titlebar_str = match app.titlebar {
                    Some(true) => "Show",
                    Some(false) => "Hide",
                    None => "Inherit",
                };

                let display_url = if app.url.len() > 32 {
                    format!("{}...", &app.url[..29])
                } else {
                    app.url.clone()
                };

                println!("{:<16}  {:<20}  {:<18}  {:<10}  {}", app.id, app.name, engine_str, titlebar_str, display_url);
            }

            println!("\n{} application(s) installed.", apps.len());
            0
        }
        Err(e) => {
            eprintln!("Error loading applications: {}", e);
            1
        }
    }
}

fn cmd_install(args: &[String]) -> i32 {
    let mut url: Option<String> = None;
    let mut name: Option<String> = None;
    let mut engine_type = "webkit".to_string();
    let mut browser = "".to_string();
    let mut icon_arg: Option<String> = None;
    let mut titlebar: Option<bool> = None;

    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        match arg.as_str() {
            "-n" | "--name" => {
                if i + 1 < args.len() {
                    name = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "-e" | "--engine" => {
                if i + 1 < args.len() {
                    engine_type = args[i + 1].to_lowercase();
                    i += 1;
                }
            }
            "-b" | "--browser" => {
                if i + 1 < args.len() {
                    browser = args[i + 1].clone();
                    i += 1;
                }
            }
            "-i" | "--icon" => {
                if i + 1 < args.len() {
                    icon_arg = Some(args[i + 1].clone());
                    i += 1;
                }
            }
            "--titlebar" => {
                if i + 1 < args.len() {
                    let val = args[i + 1].to_lowercase();
                    titlebar = match val.as_str() {
                        "show" | "true" | "yes" | "on" => Some(true),
                        "hide" | "false" | "no" | "off" => Some(false),
                        _ => None,
                    };
                    i += 1;
                }
            }
            "--no-titlebar" => {
                titlebar = Some(false);
            }
            _ => {
                if !arg.starts_with('-') && url.is_none() {
                    url = Some(arg.clone());
                }
            }
        }
        i += 1;
    }

    let raw_url = match url {
        Some(u) => u,
        None => {
            eprintln!("Error: URL required. Usage: kyvyrn install <URL> [OPTIONS]");
            return 1;
        }
    };

    let normalized_url = match normalize_url(raw_url.clone()) {
        Ok(u) => u,
        Err(e) => {
            eprintln!("Invalid URL: {}", e);
            return 1;
        }
    };

    let app_name = name.unwrap_or_else(|| derive_name_from_url(&normalized_url));
    let id = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_millis()
        .to_string();

    let folder = generate_app_folder(&app_name, &id);
    let app_directory = app_dir(&folder);

    if let Err(e) = std::fs::create_dir_all(&app_directory) {
        eprintln!("Failed to create app directory: {}", e);
        return 1;
    }

    let engine = if engine_type == "chromium" {
        let chosen_browser = if browser.is_empty() {
            crate::utils::browser::detect_chromium_browser().unwrap_or_else(|_| "chromium".to_string())
        } else {
            browser
        };
        let _ = std::fs::create_dir_all(crate::utils::paths::app_profile_dir(&folder));
        Engine::Chromium { browser: chosen_browser }
    } else {
        let _ = std::fs::create_dir_all(crate::utils::paths::app_webkit_data_dir(&folder));
        let _ = deploy_runner_binary(&folder);
        Engine::WebKit
    };

    let config = AppConfig {
        id: id.clone(),
        name: app_name.clone(),
        url: normalized_url.clone(),
        description: format!("{} web app", app_name),
        created_at: SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        engine: engine.clone(),
        folder: folder.clone(),
        titlebar,
    };

    let config_path = app_directory.join("config.json");
    if let Err(e) = save_config(&config_path, &config) {
        eprintln!("Failed to save config: {}", e);
        return 1;
    }

    // Handle Icon
    let target_icon = icon_path(&id);
    if let Some(parent) = target_icon.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    if let Some(custom_icon) = icon_arg {
        let custom_path = PathBuf::from(custom_icon);
        if custom_path.exists() {
            if let Ok(bytes) = std::fs::read(&custom_path) {
                let _ = crate::commands::icons::save_app_icon(id.clone(), bytes);
            }
        }
    } else {
        print!("Fetching site icon... ");
        std::io::Write::flush(&mut std::io::stdout()).ok();
        match crate::commands::icons::fetch_site_icon(id.clone(), normalized_url.clone()) {
            Ok(_) => println!("done."),
            Err(_) => println!("skipped (default icon will be used)."),
        }
    }

    // Write .desktop entry
    match write_desktop_entry(&config) {
        Ok(desktop_path) => {
            println!("\n✔ Successfully installed {}", app_name);
            println!("  • ID:          {}", id);
            println!("  • Engine:      {}", match &engine {
                Engine::WebKit => "WebKit".to_string(),
                Engine::Chromium { browser } => format!("Chromium ({})", browser),
            });
            println!("  • URL:         {}", normalized_url);
            println!("  • Launcher:    {}", desktop_path.display());
            println!("  • Launch with: kyvyrn launch {}", id);
            0
        }
        Err(e) => {
            eprintln!("Warning: Created app but failed to register desktop launcher: {}", e);
            0
        }
    }
}

fn cmd_remove(args: &[String]) -> i32 {
    let query = match args.first() {
        Some(q) => q,
        None => {
            eprintln!("Error: App name or ID required. Usage: kyvyrn rm <NAME|ID>");
            return 1;
        }
    };

    match find_app_by_query(query) {
        Ok(Some(app)) => {
            // Delete app directory
            if let Ok(dir) = app_dir_by_id(&app.id) {
                let _ = std::fs::remove_dir_all(dir);
            }

            // Remove desktop entry & icon
            let _ = remove_desktop_entry(&app.id);
            let icon_file = icon_path(&app.id);
            if icon_file.exists() {
                let _ = std::fs::remove_file(icon_file);
            }

            println!("✔ Removed \"{}\" ({})", app.name, app.id);
            0
        }
        Ok(None) => {
            eprintln!("Error: No application found matching '{}'. Run 'kyvyrn list' to see installed apps.", query);
            1
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            1
        }
    }
}

fn cmd_launch(args: &[String]) -> i32 {
    let query = match args.first() {
        Some(q) => q,
        None => {
            eprintln!("Error: App name or ID required. Usage: kyvyrn launch <NAME|ID>");
            return 1;
        }
    };

    match find_app_by_query(query) {
        Ok(Some(app)) => {
            match &app.engine {
                Engine::Chromium { browser } => {
                    let _ = crate::commands::chromium::open_chromium_app_window(
                        Some(app.id),
                        app.name,
                        app.url,
                        Some(browser.clone())
                    );
                    0
                }
                Engine::WebKit => {
                    let app_dir = match app_dir_by_id(&app.id) {
                        Ok(d) => d,
                        Err(e) => {
                            eprintln!("Failed to find app directory: {}", e);
                            return 1;
                        }
                    };
                    crate::run_webkit_window(app, app_dir);
                    0
                }
            }
        }
        Ok(None) => {
            eprintln!("Error: No application found matching '{}'.", query);
            1
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            1
        }
    }
}

fn cmd_info(args: &[String]) -> i32 {
    let query = match args.first() {
        Some(q) => q,
        None => {
            eprintln!("Error: App name or ID required. Usage: kyvyrn info <NAME|ID>");
            return 1;
        }
    };

    match find_app_by_query(query) {
        Ok(Some(app)) => {
            let app_directory = app_dir_by_id(&app.id).map(|p| p.display().to_string()).unwrap_or_else(|_| "Unknown".to_string());
            let desktop_path = crate::utils::paths::desktop_entry_path(&app.id);
            let icon_file = icon_path(&app.id);

            println!("Name:         {}", app.name);
            println!("ID:           {}", app.id);
            println!("URL:          {}", app.url);
            println!("Engine:       {}", match &app.engine {
                Engine::WebKit => "WebKit".to_string(),
                Engine::Chromium { browser } => format!("Chromium ({})", browser),
            });
            println!("Titlebar:     {}", match app.titlebar {
                Some(true) => "Show (Explicitly enabled)",
                Some(false) => "Hide (Explicitly disabled)",
                None => "Inherit (Using global setting)",
            });
            println!("Directory:    {}", app_directory);
            println!("Launcher:     {}", desktop_path.display());
            println!("Icon:         {}", if icon_file.exists() { icon_file.display().to_string() } else { "Default".to_string() });
            0
        }
        Ok(None) => {
            eprintln!("Error: No application found matching '{}'.", query);
            1
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            1
        }
    }
}

fn cmd_config(args: &[String]) -> i32 {
    if args.is_empty() {
        let global = load_global_config().unwrap_or_default();
        println!("Global Configuration (~/.config/kyvyrn/config.json):");
        println!("  • Titlebar: {}", if global.titlebar { "Show" } else { "Hide" });
        return 0;
    }

    let key = args[0].to_lowercase();
    match key.as_str() {
        "titlebar" => {
            if args.len() < 2 {
                let global = load_global_config().unwrap_or_default();
                println!("titlebar: {}", if global.titlebar { "show" } else { "hide" });
                return 0;
            }
            let val = args[1].to_lowercase();
            let show = match val.as_str() {
                "show" | "true" | "yes" | "on" => true,
                "hide" | "false" | "no" | "off" => false,
                _ => {
                    eprintln!("Invalid value for titlebar. Use 'show' or 'hide'.");
                    return 1;
                }
            };
            let mut global = load_global_config().unwrap_or_default();
            global.titlebar = show;
            if let Err(e) = save_global_config(global) {
                eprintln!("Failed to save config: {}", e);
                return 1;
            }
            println!("✔ Global titlebar set to: {}", if show { "Show" } else { "Hide" });
            0
        }
        _ => {
            eprintln!("Unknown config key '{}'. Available keys: 'titlebar'", key);
            1
        }
    }
}

fn find_app_by_query(query: &str) -> Result<Option<AppConfig>, String> {
    let apps = list_all_configs()?;
    let query_lower = query.to_lowercase();

    // 1. Exact ID match
    if let Some(app) = apps.iter().find(|a| a.id == query) {
        return Ok(Some(app.clone()));
    }

    // 2. Exact Name match (case-insensitive)
    if let Some(app) = apps.iter().find(|a| a.name.to_lowercase() == query_lower) {
        return Ok(Some(app.clone()));
    }

    // 3. Prefix / Substring match
    if let Some(app) = apps.iter().find(|a| a.name.to_lowercase().contains(&query_lower) || a.id.contains(&query_lower)) {
        return Ok(Some(app.clone()));
    }

    Ok(None)
}

fn derive_name_from_url(url_str: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url_str) {
        if let Some(host) = parsed.host_str() {
            let clean_host = host.strip_prefix("www.").or_else(|| host.strip_prefix("web.")).unwrap_or(host);
            let domain_parts: Vec<&str> = clean_host.split('.').collect();
            if let Some(first) = domain_parts.first() {
                let mut chars = first.chars();
                if let Some(first_char) = chars.next() {
                    return format!("{}{}", first_char.to_uppercase(), chars.as_str());
                }
            }
        }
    }
    "WebApp".to_string()
}
