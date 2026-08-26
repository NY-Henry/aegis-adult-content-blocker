use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DnsProvider {
    Cloudflare,     // 1.1.1.3 (Malware + Adult Content)
    CleanBrowsing, // 185.228.168.168 (Family Filter)
    AdGuard,       // 94.140.14.15 (Family Protection)
}

impl Default for DnsProvider {
    fn default() -> Self {
        DnsProvider::Cloudflare
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub shield_enabled: bool,
    pub dns_blocking_enabled: bool,
    pub dns_provider: DnsProvider,
    pub hosts_blocking_enabled: bool,
    pub browser_policies_enabled: bool,
    pub watchdog_enabled: bool,
    pub custom_blocked_domains: Vec<String>,
    pub blocked_keywords: Vec<String>,
    pub pin_hash: Option<String>,
    pub pin_salt: Option<String>,
    pub unlock_delay_minutes: u32,
    pub unlock_requested_at: Option<i64>,
    pub autostart_enabled: bool,
    pub total_blocked_attempts: u64,
    pub last_sync_timestamp: Option<i64>,
    pub active_blocklist_count: usize,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            shield_enabled: true,
            dns_blocking_enabled: true,
            dns_provider: DnsProvider::Cloudflare,
            hosts_blocking_enabled: true,
            browser_policies_enabled: true,
            watchdog_enabled: true,
            custom_blocked_domains: vec![
                "pornhub.com".into(),
                "xvideos.com".into(),
                "xnxx.com".into(),
                "redtube.com".into(),
                "youporn.com".into(),
                "xhamster.com".into(),
                "chaturbate.com".into(),
                "onlyfans.com".into(),
                "stripchat.com".into(),
                "livejasmin.com".into(),
            ],
            blocked_keywords: vec![
                "pornhub".into(),
                "xvideos".into(),
                "xnxx".into(),
                "redtube".into(),
                "xhamster".into(),
                "chaturbate".into(),
                "onlyfans".into(),
                "livejasmin".into(),
                "free porn".into(),
                "adult video".into(),
                "camgirl".into(),
                "sex video".into(),
                "hardcore porn".into(),
                "xxx video".into(),
            ],
            pin_hash: None,
            pin_salt: None,
            unlock_delay_minutes: 15,
            unlock_requested_at: None,
            autostart_enabled: true,
            total_blocked_attempts: 0,
            last_sync_timestamp: None,
            active_blocklist_count: 0,
        }
    }
}

impl AppConfig {
    pub fn config_path() -> PathBuf {
        let mut path = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("AegisGuard");
        let _ = fs::create_dir_all(&path);
        path.push("config.json");
        path
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<AppConfig>(&data) {
                return config;
            }
        }
        let default_config = Self::default();
        let _ = default_config.save();
        default_config
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let serialized = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&path, serialized)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        Ok(())
    }
}

// Fallback for dirs if dirs_next is not used:
mod dirs_next {
    use std::path::PathBuf;
    pub fn data_dir() -> Option<PathBuf> {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }
}
