pub fn normalize_url(input: String) -> Result<String, String> {
  let trimmed = input.trim();

  if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
    Ok(trimmed.to_string())
  } else {
    Ok(format!("https://{}", trimmed))
  }
}

pub fn normalize_base_url(input: &str) -> String {
  let trimmed = input.trim_end_matches('/');

  if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
    trimmed.to_string()
  } else {
    format!("https://{}", trimmed)
  }
}
