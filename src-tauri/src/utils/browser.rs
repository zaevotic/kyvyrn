pub fn command_exists(cmd: &str) -> bool {
    std::process::Command
        ::new("which")
        .arg(cmd)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn detect_chromium_browser() -> Result<String, String> {
    let candidates = [
        "brave",
        "brave-browser",
        "brave-browser-stable",
        "brave-browser-nightly",
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "vivaldi",
        "opera",
        "microsoft-edge",
    ];

    for browser in candidates {
        if command_exists(browser) {
            return Ok(browser.to_string());
        }
    }

    Err("No supported Chromium-based browser found".into())
}

#[tauri::command]
pub fn detect_chromium_browsers() -> Vec<String> {
    let candidates = [
        "brave",
        "brave-browser",
        "brave-browser-stable",
        "brave-browser-nightly",
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
        "vivaldi",
        "opera",
        "microsoft-edge",
    ];

    candidates
        .iter()
        .filter(|cmd| crate::utils::browser::command_exists(cmd))
        .map(|s| s.to_string())
        .collect()
}
