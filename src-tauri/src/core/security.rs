use rand::Rng;
use sha2::{Digest, Sha256};
use serde::{Deserialize, Serialize};
use crate::core::config::AppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CooldownStatus {
    NoCooldownRequired,
    Unlocked,
    Waiting { seconds_remaining: i64, total_seconds: i64 },
    Expired,
}

pub struct SecurityManager;

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
            None => CooldownStatus::Waiting {
                seconds_remaining: (config.unlock_delay_minutes as i64) * 60,
                total_seconds: (config.unlock_delay_minutes as i64) * 60,
            },
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
