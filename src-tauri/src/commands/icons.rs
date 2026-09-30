use crate::net::http::fetch_url_bytes;
use crate::utils::url::normalize_base_url;
use std::path::PathBuf;

fn fetch_html(url: &str) -> Result<String, String> {
    let (bytes, ct) = fetch_url_bytes(url)?;

    if !ct.contains("text/html") {
        return Err("Not HTML".into());
    }

    String::from_utf8(bytes).map_err(|_| "Invalid HTML encoding".into())
}

fn parse_sizes(sizes: Option<&str>) -> u32 {
    let sizes = match sizes {
        Some(s) => s,
        None => {
            return 0;
        }
    };

    // sizes="32x32" OR "180x180"
    if let Some((w, h)) = sizes.split_once('x') {
        let w: u32 = w.parse().unwrap_or(0);
        let h: u32 = h.parse().unwrap_or(0);
        return w * h;
    }

    0
}

fn try_favicon_from_html(base: &str) -> Result<Vec<u8>, String> {
    use scraper::{ Html, Selector };
    use url::Url;

    let html = fetch_html(base)?;
    let document = Html::parse_document(&html);

    let selector = Selector::parse("link[rel]").unwrap();
    let base_url = Url::parse(base).map_err(|_| "Invalid base URL")?;

    let mut best: Option<(u32, bool, Url)> = None;

    for el in document.select(&selector) {
        let rel = el.value().attr("rel").unwrap_or("").to_lowercase();

        if !rel.contains("icon") {
            continue;
        }

        let href = match el.value().attr("href") {
            Some(h) => h,
            None => {
                continue;
            }
        };

        let icon_url = match base_url.join(href) {
            Ok(u) => u,
            Err(_) => {
                continue;
            }
        };

        let sizes_attr = el.value().attr("sizes");
        let score = parse_sizes(sizes_attr);

        let is_svg = href.ends_with(".svg");

        let candidate = (score, is_svg, icon_url);

        match &best {
            None => {
                best = Some(candidate);
            }
            Some((best_score, best_svg, _)) => {
                // SVG always wins
                if is_svg && !best_svg {
                    best = Some(candidate);
                } else if
                    // Otherwise pick larger bitmap
                    !is_svg &&
                    !best_svg &&
                    score > *best_score
                {
                    best = Some(candidate);
                }
            }
        }
    }

    let (_, is_svg, url) = best.ok_or("No icon links found")?;
    let (bytes, ct) = fetch_url_bytes(url.as_str())?;

    if is_svg || ct.contains("svg") {
        return render_svg_to_png(&bytes);
    }

    let img = image::load_from_memory(&bytes).map_err(|_| "Failed to decode icon")?;

    let mut out = Vec::new();
    img
        .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(out)
}

fn icon_path(app_id: &str) -> PathBuf {
    crate::utils::paths::icon_path(app_id)
}

fn sync_app_desktop_entry(app_id: &str) {
    if let Ok(app_dir) = crate::utils::paths::app_dir_by_id(app_id) {
        let config_path = app_dir.join("config.json");
        if let Ok(config) = crate::commands::configs::load_config(&config_path) {
            let _ = crate::utils::desktop::write_desktop_entry(&config);
        }
    }
}

fn try_favicon_ico(base: &str) -> Result<Vec<u8>, String> {
    let url = format!("{}/favicon.ico", base);
    let (bytes, ct) = fetch_url_bytes(&url)?;

    if ct.contains("text/html") {
        return Err("Not bitmap".into());
    }

    let img = image::load_from_memory(&bytes).map_err(|_| "Decode failed")?;

    let mut out = Vec::new();
    img
        .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(out)
}

fn render_svg_to_png(svg_bytes: &[u8]) -> Result<Vec<u8>, String> {
    let opt = resvg::usvg::Options::default();
    let tree = resvg::usvg::Tree::from_data(svg_bytes, &opt).map_err(|_| "Invalid SVG")?;

    let size = tree.size();

    let target = 256f32;

    let scale_x = target / size.width();
    let scale_y = target / size.height();

    let mut pixmap = resvg::tiny_skia::Pixmap
        ::new(target as u32, target as u32)
        .ok_or("Pixmap allocation failed")?;

    resvg::render(
        &tree,
        resvg::tiny_skia::Transform::from_scale(scale_x, scale_y),
        &mut pixmap.as_mut()
    );

    pixmap.encode_png().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_icon_bytes(app_id: String) -> Result<Vec<u8>, String> {
    let path = icon_path(&app_id);
    std::fs::read(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_app_icon_path(app_id: String) -> Option<String> {
    let path = icon_path(&app_id);

    if path.exists() {
        Some(path.to_string_lossy().to_string())
    } else {
        None
    }
}

#[tauri::command]
pub fn refresh_site_icon(app_id: String, url: String) -> Result<(), String> {
    let path = icon_path(&app_id);

    let base = normalize_base_url(&url);
    let png = try_favicon_ico(&base).or_else(|_| try_favicon_from_html(&base))?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, &png).map_err(|e| e.to_string())?;
    sync_app_desktop_entry(&app_id);
    Ok(())
}

#[tauri::command]
pub fn fetch_site_icon(app_id: String, url: String) -> Result<(), String> {
    let path = icon_path(&app_id);

    if path.exists() {
        return Ok(());
    }

    let base = normalize_base_url(&url);
    let png = try_favicon_ico(&base).or_else(|_| try_favicon_from_html(&base))?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, &png).map_err(|e| e.to_string())?;
    sync_app_desktop_entry(&app_id);
    Ok(())
}

#[tauri::command]
pub fn save_app_icon(app_id: String, icon_bytes: Vec<u8>) -> Result<(), String> {
    let path = icon_path(&app_id);

    let img = image::load_from_memory(&icon_bytes).map_err(|_| "Invalid image")?;

    let mut out = Vec::new();
    img
        .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&path, out).map_err(|e| e.to_string())?;
    sync_app_desktop_entry(&app_id);
    Ok(())
}
