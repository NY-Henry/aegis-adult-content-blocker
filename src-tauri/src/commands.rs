use crate::core::config::{AppConfig, DnsProvider};
use crate::core::security::{CooldownStatus, SecurityManager};
use crate::core::state::AppState;
use crate::engine::dns::DnsManager;
use crate::engine::elevation::{is_elevated, relaunch_as_admin};
use crate::engine::hosts::HostsManager;
use crate::engine::policies::PolicyManager;
use serde::{Deserialize, Serialize};
use std::sync::atomic::Ordering;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusResponse {
    pub youtube_policy_restricted: Option<bool>,
    pub setup_error: Option<String>,
    pub shield_enabled: bool,
    pub is_admin: bool,
    pub dns_blocking_enabled: bool,
    pub dns_provider: DnsProvider,
    pub hosts_blocking_enabled: bool,
    pub browser_policies_enabled: bool,
    pub watchdog_enabled: bool,
    pub custom_blocked_domains: Vec<String>,
    pub blocked_keywords: Vec<String>,
    pub has_pin: bool,
    pub unlock_delay_minutes: u32,
    pub cooldown_status: CooldownStatus,
    pub total_blocked_attempts: u64,
    pub last_sync_timestamp: Option<i64>,
    pub active_blocklist_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsPayload {
    pub dns_blocking_enabled: bool,
    pub dns_provider: DnsProvider,
    pub hosts_blocking_enabled: bool,
    pub browser_policies_enabled: bool,
    pub watchdog_enabled: bool,
    pub unlock_delay_minutes: u32,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub total_domains: usize,
    pub timestamp: i64,
}

pub(crate) fn enforce_protection_rules(config: &mut AppConfig) -> Result<(), String> {
    if !is_elevated() {
        return Ok(()); // Non-admin cannot apply system level changes directly
    }

    if config.shield_enabled {
        // Apply DNS
        if config.dns_blocking_enabled {
            DnsManager::apply_dns(&config.dns_provider)?;
        } else {
            DnsManager::reset_dns()?;
        }

        // Apply Hosts
        if config.hosts_blocking_enabled {
            config.active_blocklist_count = HostsManager::apply_hosts_blocklist(
                &config.custom_blocked_domains,
                Some(&config.downloaded_blocked_domains),
            )?;
        } else {
            HostsManager::remove_hosts_blocklist()?;
            config.active_blocklist_count = 0;
        }

        // Apply Policies
        if config.browser_policies_enabled {
            PolicyManager::apply_policies()?;
        } else {
            PolicyManager::remove_policies()?;
        }
    } else {
        // Disable all
        DnsManager::reset_dns()?;
        HostsManager::remove_hosts_blocklist()?;
        PolicyManager::remove_policies()?;
        config.active_blocklist_count = 0;
    }

    Ok(())
}

fn commit_config(current: &mut AppConfig, mut next: AppConfig) -> Result<(), String> {
    if let Err(error) = enforce_protection_rules(&mut next).and_then(|_| next.save()) {
        let mut previous = current.clone();
        return match enforce_protection_rules(&mut previous) {
            Ok(()) => Err(error),
            Err(rollback) => Err(format!(
                "{error}. Previous protection could not be restored: {rollback}"
            )),
        };
    }
    *current = next;
    Ok(())
}

#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<AppStatusResponse, String> {
    let cfg = state.config.read().await;
    let cooldown_status = SecurityManager::get_cooldown_status(&cfg);
    let blocks = state.block_counter.load(Ordering::SeqCst);

    Ok(AppStatusResponse {
        setup_error: state.setup_error.read().await.clone(),
        youtube_policy_restricted: PolicyManager::youtube_policy_restricted().ok(),
        shield_enabled: cfg.shield_enabled,
        is_admin: state.is_admin,
        dns_blocking_enabled: cfg.dns_blocking_enabled,
        dns_provider: cfg.dns_provider.clone(),
        hosts_blocking_enabled: cfg.hosts_blocking_enabled,
        browser_policies_enabled: cfg.browser_policies_enabled,
        watchdog_enabled: cfg.watchdog_enabled,
        custom_blocked_domains: cfg.custom_blocked_domains.clone(),
        blocked_keywords: cfg.blocked_keywords.clone(),
        has_pin: cfg.pin_hash.is_some(),
        unlock_delay_minutes: cfg.unlock_delay_minutes,
        cooldown_status,
        total_blocked_attempts: blocks,
        last_sync_timestamp: cfg.last_sync_timestamp,
        active_blocklist_count: cfg.active_blocklist_count,
    })
}

#[tauri::command]
pub async fn toggle_shield(
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<AppStatusResponse, String> {
    let mut cfg = state.config.write().await;

    // Verify PIN if set
    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    // If turning OFF and cooldown is configured, verify cooldown has expired
    if cfg.shield_enabled && cfg.unlock_delay_minutes > 0 {
        match SecurityManager::get_cooldown_status(&cfg) {
            CooldownStatus::Unlocked => {}
            CooldownStatus::Waiting {
                seconds_remaining, ..
            } => {
                return Err(format!(
                    "Shield is locked. Please wait {} seconds cooldown.",
                    seconds_remaining
                ));
            }
            _ => {
                return Err("Unlock cooldown required before turning off the shield.".into());
            }
        }
    }

    let mut next = cfg.clone();
    next.shield_enabled = !next.shield_enabled;
    next.unlock_requested_at = None;
    commit_config(&mut cfg, next)?;
    *state.setup_error.write().await = None;

    let cooldown = SecurityManager::get_cooldown_status(&cfg);
    let blocks = state.block_counter.load(Ordering::SeqCst);

    Ok(AppStatusResponse {
        setup_error: state.setup_error.read().await.clone(),
        youtube_policy_restricted: PolicyManager::youtube_policy_restricted().ok(),
        shield_enabled: cfg.shield_enabled,
        is_admin: state.is_admin,
        dns_blocking_enabled: cfg.dns_blocking_enabled,
        dns_provider: cfg.dns_provider.clone(),
        hosts_blocking_enabled: cfg.hosts_blocking_enabled,
        browser_policies_enabled: cfg.browser_policies_enabled,
        watchdog_enabled: cfg.watchdog_enabled,
        custom_blocked_domains: cfg.custom_blocked_domains.clone(),
        blocked_keywords: cfg.blocked_keywords.clone(),
        has_pin: cfg.pin_hash.is_some(),
        unlock_delay_minutes: cfg.unlock_delay_minutes,
        cooldown_status: cooldown,
        total_blocked_attempts: blocks,
        last_sync_timestamp: cfg.last_sync_timestamp,
        active_blocklist_count: cfg.active_blocklist_count,
    })
}

#[tauri::command]
pub async fn request_unlock(
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<CooldownStatus, String> {
    let mut cfg = state.config.write().await;

    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    let now = chrono::Utc::now().timestamp();
    cfg.unlock_requested_at = Some(now);
    cfg.save()?;

    Ok(SecurityManager::get_cooldown_status(&cfg))
}

#[tauri::command]
pub async fn cancel_unlock(state: State<'_, AppState>) -> Result<(), String> {
    let mut cfg = state.config.write().await;
    cfg.unlock_requested_at = None;
    cfg.save()?;
    Ok(())
}

#[tauri::command]
pub async fn set_pin(
    current_pin: Option<String>,
    new_pin: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if new_pin.trim().len() < 4 {
        return Err("PIN must be at least 4 characters long".into());
    }

    let mut cfg = state.config.write().await;

    if cfg.pin_hash.is_some() {
        let cur = current_pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&cur, &cfg) {
            return Err("Current PIN is incorrect".into());
        }
    }

    let salt = SecurityManager::generate_salt();
    let hash = SecurityManager::hash_pin(new_pin.trim(), &salt);

    cfg.pin_salt = Some(salt);
    cfg.pin_hash = Some(hash);
    cfg.save()?;

    Ok(())
}

#[tauri::command]
pub async fn remove_pin(current_pin: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut cfg = state.config.write().await;

    if !SecurityManager::verify_pin(&current_pin, &cfg) {
        return Err("Incorrect PIN".into());
    }

    cfg.pin_hash = None;
    cfg.pin_salt = None;
    cfg.save()?;

    Ok(())
}

#[tauri::command]
pub async fn update_settings(
    settings: UpdateSettingsPayload,
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<AppStatusResponse, String> {
    let mut cfg = state.config.write().await;

    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    if settings.unlock_delay_minutes > 1440 {
        return Err("Pause delay must be at most 24 hours.".into());
    }
    let mut next = cfg.clone();
    next.dns_blocking_enabled = settings.dns_blocking_enabled;
    next.dns_provider = DnsProvider::Cloudflare;
    next.hosts_blocking_enabled = settings.hosts_blocking_enabled;
    next.browser_policies_enabled = settings.browser_policies_enabled;
    next.watchdog_enabled = settings.watchdog_enabled;
    next.unlock_delay_minutes = settings.unlock_delay_minutes;
    commit_config(&mut cfg, next)?;
    *state.setup_error.write().await = None;

    let cooldown = SecurityManager::get_cooldown_status(&cfg);
    let blocks = state.block_counter.load(Ordering::SeqCst);

    Ok(AppStatusResponse {
        setup_error: state.setup_error.read().await.clone(),
        youtube_policy_restricted: PolicyManager::youtube_policy_restricted().ok(),
        shield_enabled: cfg.shield_enabled,
        is_admin: state.is_admin,
        dns_blocking_enabled: cfg.dns_blocking_enabled,
        dns_provider: cfg.dns_provider.clone(),
        hosts_blocking_enabled: cfg.hosts_blocking_enabled,
        browser_policies_enabled: cfg.browser_policies_enabled,
        watchdog_enabled: cfg.watchdog_enabled,
        custom_blocked_domains: cfg.custom_blocked_domains.clone(),
        blocked_keywords: cfg.blocked_keywords.clone(),
        has_pin: cfg.pin_hash.is_some(),
        unlock_delay_minutes: cfg.unlock_delay_minutes,
        cooldown_status: cooldown,
        total_blocked_attempts: blocks,
        last_sync_timestamp: cfg.last_sync_timestamp,
        active_blocklist_count: cfg.active_blocklist_count,
    })
}

#[tauri::command]
pub async fn add_blocked_domain(
    domain: String,
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let clean = crate::engine::domains::normalize_domain(&domain)?;
    if crate::engine::domains::is_youtube_domain(&clean) {
        return Err("YouTube and its media domains are excluded from blocking.".into());
    }

    let mut cfg = state.config.write().await;
    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    if !cfg.custom_blocked_domains.contains(&clean) {
        let mut next = cfg.clone();
        next.custom_blocked_domains.push(clean);
        commit_config(&mut cfg, next)?;
    }

    Ok(cfg.custom_blocked_domains.clone())
}

#[tauri::command]
pub async fn remove_blocked_domain(
    domain: String,
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let clean = domain.trim().to_lowercase();
    let mut cfg = state.config.write().await;

    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    let mut next = cfg.clone();
    next.custom_blocked_domains.retain(|d| d != &clean);
    commit_config(&mut cfg, next)?;

    Ok(cfg.custom_blocked_domains.clone())
}

#[tauri::command]
pub async fn add_blocked_keyword(
    keyword: String,
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let clean = keyword.trim().to_lowercase();
    if clean.is_empty() {
        return Err("Keyword cannot be empty".into());
    }

    let mut cfg = state.config.write().await;
    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    if !cfg.blocked_keywords.contains(&clean) {
        cfg.blocked_keywords.push(clean);
        cfg.save()?;
    }

    Ok(cfg.blocked_keywords.clone())
}

#[tauri::command]
pub async fn remove_blocked_keyword(
    keyword: String,
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let clean = keyword.trim().to_lowercase();
    let mut cfg = state.config.write().await;

    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    cfg.blocked_keywords.retain(|k| k != &clean);
    cfg.save()?;

    Ok(cfg.blocked_keywords.clone())
}

#[tauri::command]
pub async fn sync_blocklist(
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<SyncResult, String> {
    {
        let cfg = state.config.read().await;
        if !state.is_admin || !cfg.shield_enabled || !cfg.hosts_blocking_enabled {
            return Err("Sync requires administrator access and enabled site protection.".into());
        }
        if !SecurityManager::verify_pin(&pin.clone().unwrap_or_default(), &cfg) {
            return Err("Invalid security PIN".into());
        }
    }
    let domains = HostsManager::fetch_stevenblack_adult_blocklist().await?;
    let mut cfg = state.config.write().await;
    if !state.is_admin || !cfg.shield_enabled || !cfg.hosts_blocking_enabled {
        return Err("Protection changed during sync. Enable site protection and retry.".into());
    }
    if !SecurityManager::verify_pin(&pin.unwrap_or_default(), &cfg) {
        return Err("Security PIN changed during sync. Please retry.".into());
    }

    let now = chrono::Utc::now().timestamp();
    let mut next = cfg.clone();
    next.downloaded_blocked_domains = domains;
    next.last_sync_timestamp = Some(now);
    commit_config(&mut cfg, next)?;

    Ok(SyncResult {
        total_domains: cfg.active_blocklist_count,
        timestamp: now,
    })
}

#[tauri::command]
pub async fn relaunch_admin() -> Result<(), String> {
    relaunch_as_admin()
}

#[tauri::command]
pub async fn reset_stats(pin: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let mut cfg = state.config.write().await;
    if cfg.pin_hash.is_some() {
        let p = pin.unwrap_or_default();
        if !SecurityManager::verify_pin(&p, &cfg) {
            return Err("Invalid security PIN".into());
        }
    }

    state.block_counter.store(0, Ordering::SeqCst);
    cfg.total_blocked_attempts = 0;
    cfg.save()?;

    Ok(())
}

#[tauri::command]
pub async fn quit_app(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.config.read().await.save()?;
    crate::engine::watchdog::WatchdogSentinel::stop(state.watchdog_active.clone());
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn restore_youtube(
    pin: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if !state.is_admin {
        return Err("Run as administrator to restore YouTube settings.".into());
    }
    let cfg = state.config.read().await;
    if !SecurityManager::verify_pin(&pin.unwrap_or_default(), &cfg) {
        return Err("Invalid security PIN".into());
    }
    PolicyManager::restore_youtube_policies()?;
    HostsManager::remove_legacy_youtube_overrides()?;
    DnsManager::flush_dns_cache()?;
    Ok(())
}
