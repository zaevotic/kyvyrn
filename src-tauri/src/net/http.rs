use reqwest::blocking::Client;

pub fn http_client() -> Result<Client, String> {
  Client::builder()
    .user_agent("Mozilla/5.0 (X11; Linux x86_64)")
    .redirect(reqwest::redirect::Policy::limited(5))
    .build()
    .map_err(|e| e.to_string())
}

pub fn fetch_url_bytes(url: &str) -> Result<(Vec<u8>, String), String> {
  let client = http_client()?;
  let resp = client.get(url).send().map_err(|e| e.to_string())?;

  if !resp.status().is_success() {
    return Err(format!("HTTP {}", resp.status()));
  }

  let content_type = resp
    .headers()
    .get(reqwest::header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .unwrap_or("")
    .to_string();

  let bytes = resp.bytes().map_err(|e| e.to_string())?.to_vec();
  Ok((bytes, content_type))
}
