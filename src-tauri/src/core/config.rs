use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DnsProvider {
    Cloudflare,    // 1.1.1.3 (Malware + Adult Content)
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
    #[serde(default)]
    pub downloaded_blocked_domains: Vec<String>,
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
            watchdog_enabled: false,
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
            downloaded_blocked_domains: Vec::new(),
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
            if let Ok(mut config) = serde_json::from_str::<AppConfig>(&data) {
                if config.migrate_youtube_compatibility() {
                    let _ = config.save();
                }
                return config;
            }
        }
        let default_config = Self::default();
        let _ = default_config.save();
        default_config
    }

    pub fn migrate_youtube_compatibility(&mut self) -> bool {
        let mut changed = self.dns_provider != DnsProvider::Cloudflare;
        self.dns_provider = DnsProvider::Cloudflare;
        let old = self.custom_blocked_domains.len();
        self.custom_blocked_domains.retain(|domain| {
            crate::engine::domains::normalize_domain(domain)
                .map(|domain| !crate::engine::domains::is_youtube_domain(&domain))
                .unwrap_or(true)
        });
        changed |= old != self.custom_blocked_domains.len();
        changed
    }

    pub fn save(&self) -> Result<(), String> {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let serialized = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&path, serialized).map_err(|e| format!("Failed to write config file: {}", e))?;
        Ok(())
    }
}

// Fallback for dirs if dirs_next is not used:
#[cfg(test)]
mod compatibility_tests {
    use super::*;

    #[test]
    fn migration_preserves_preferences_and_removes_only_youtube_custom_rules() {
        let mut config = AppConfig::default();
        config.dns_provider = DnsProvider::CleanBrowsing;
        config.custom_blocked_domains = vec!["HTTPS://WWW.YouTube.com/watch".into(), "example.com".into()];
        config.watchdog_enabled = true;
        config.pin_hash = Some("existing-pin-hash".into());
        assert!(config.migrate_youtube_compatibility());
        assert_eq!(config.dns_provider, DnsProvider::Cloudflare);
        assert_eq!(config.custom_blocked_domains, vec!["example.com"]);
        assert!(config.watchdog_enabled);
        assert_eq!(config.pin_hash.as_deref(), Some("existing-pin-hash"));
        assert!(!config.migrate_youtube_compatibility());
    }

    #[test]
    fn existing_configs_without_a_downloaded_list_remain_readable() {
        let mut value = serde_json::to_value(AppConfig::default()).unwrap();
        value.as_object_mut().unwrap().remove("downloaded_blocked_domains");
        let config: AppConfig = serde_json::from_value(value).unwrap();
        assert!(config.downloaded_blocked_domains.is_empty());
    }
}

mod dirs_next {
    use std::path::PathBuf;
    pub fn data_dir() -> Option<PathBuf> {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }
}
