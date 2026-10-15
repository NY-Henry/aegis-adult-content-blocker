/// Normalize a hostname or pasted URL before it can enter the hosts file.
pub fn normalize_domain(input: &str) -> Result<String, String> {
    let input = input.trim();
    if input.is_empty() || input.chars().any(char::is_whitespace) {
        return Err("Enter a domain or website URL without spaces.".into());
    }
    let address = if input.contains("://") {
        input.to_owned()
    } else {
        format!("https://{input}")
    };
    let url =
        reqwest::Url::parse(&address).map_err(|_| "Enter a valid website domain.".to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Use an http or https website URL.".into());
    }
    let domain = url
        .host_str()
        .ok_or("Enter a valid website domain.")?
        .trim_end_matches('.')
        .to_ascii_lowercase();
    if domain.parse::<std::net::IpAddr>().is_ok()
        || !domain.contains('.')
        || domain.len() > 253
        || domain.split('.').any(|label| {
            label.is_empty()
                || label.len() > 63
                || label.starts_with('-')
                || label.ends_with('-')
                || !label
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
    {
        return Err("Enter a website domain such as example.com, not an IP address.".into());
    }
    Ok(domain)
}

pub fn is_youtube_domain(domain: &str) -> bool {
    let domain = domain.trim_end_matches('.').to_ascii_lowercase();
    [
        "youtube.com",
        "youtu.be",
        "youtube-nocookie.com",
        "googlevideo.com",
        "ytimg.com",
        "youtubei.googleapis.com",
        "youtube.googleapis.com",
        "youtubeembeddedplayer.googleapis.com",
        "yt3.ggpht.com",
    ]
    .iter()
    .any(|base| domain == *base || domain.ends_with(&format!(".{base}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn normalizes_urls_and_prevents_hosts_injection() {
        assert_eq!(
            normalize_domain("HTTPS://Example.COM/watch?q=1").unwrap(),
            "example.com"
        );
        assert!(normalize_domain("example.com\n0.0.0.0 youtube.com").is_err());
        assert!(normalize_domain("localhost").is_err());
        assert!(normalize_domain("127.0.0.1").is_err());
        assert!(normalize_domain("-bad.example.com").is_err());
    }
    #[test]
    fn exemptions_use_hostname_boundaries() {
        assert!(is_youtube_domain("WWW.YouTube.COM."));
        assert!(is_youtube_domain("r1.googlevideo.com"));
        assert!(is_youtube_domain("youtubei.googleapis.com"));
        assert!(!is_youtube_domain("notyoutube.com"));
        assert!(!is_youtube_domain("youtube.com.example.com"));
    }
}
