use crate::core::config::AppConfig;
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CooldownStatus {
    NotRequested,
    NoCooldownRequired,
    Unlocked,
    Waiting {
        seconds_remaining: i64,
        total_seconds: i64,
    },
    Expired,
}

pub struct SecurityManager;

#[cfg(test)]
mod cooldown_tests {
    use super::*;

    #[test]
    fn cooldown_does_not_start_until_requested() {
        let config = AppConfig::default();
        assert!(config.unlock_requested_at.is_none());
        assert!(!matches!(
            SecurityManager::get_cooldown_status(&config),
            CooldownStatus::Waiting { .. }
        ));
    }

    #[test]
    fn requested_cooldown_waits_then_has_a_limited_unlock_window() {
        let mut config = AppConfig::default();
        config.unlock_delay_minutes = 5;
        let now = chrono::Utc::now().timestamp();
        config.unlock_requested_at = Some(now);
        assert!(matches!(
            SecurityManager::get_cooldown_status(&config),
            CooldownStatus::Waiting { .. }
        ));
        config.unlock_requested_at = Some(now - 301);
        assert!(matches!(
            SecurityManager::get_cooldown_status(&config),
            CooldownStatus::Unlocked
        ));
        config.unlock_requested_at = Some(now - 601);
        assert!(matches!(
            SecurityManager::get_cooldown_status(&config),
            CooldownStatus::Expired
        ));
        config.unlock_delay_minutes = 0;
        assert!(matches!(
            SecurityManager::get_cooldown_status(&config),
            CooldownStatus::NoCooldownRequired
        ));
    }
}

impl SecurityManager {
    pub fn generate_salt() -> String {
        let mut rng = rand::thread_rng();
        let salt_bytes: [u8; 16] = rng.gen();
        salt_bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }

    pub fn hash_pin(pin: &str, salt: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(salt.as_bytes());
        hasher.update(pin.as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result)
    }

    pub fn verify_pin(pin: &str, config: &AppConfig) -> bool {
        match (&config.pin_hash, &config.pin_salt) {
            (Some(stored_hash), Some(salt)) => {
                let computed = Self::hash_pin(pin, salt);
                computed == *stored_hash
            }
            (None, _) => true, // No PIN set
            _ => false,
        }
    }

    pub fn get_cooldown_status(config: &AppConfig) -> CooldownStatus {
        if config.unlock_delay_minutes == 0 {
            return CooldownStatus::NoCooldownRequired;
        }

        match config.unlock_requested_at {
            None => CooldownStatus::NotRequested,
            Some(requested_at) => {
                let now = chrono::Utc::now().timestamp();
                let required_delay = (config.unlock_delay_minutes as i64) * 60;
                let elapsed = now - requested_at;

                if elapsed < 0 {
                    // Clock skew protection
                    return CooldownStatus::Waiting {
                        seconds_remaining: required_delay,
                        total_seconds: required_delay,
                    };
                }

                if elapsed < required_delay {
                    CooldownStatus::Waiting {
                        seconds_remaining: required_delay - elapsed,
                        total_seconds: required_delay,
                    }
                } else if elapsed <= required_delay + 300 {
                    // Valid unlock window for 5 minutes (300 seconds)
                    CooldownStatus::Unlocked
                } else {
                    CooldownStatus::Expired
                }
            }
        }
    }
}
