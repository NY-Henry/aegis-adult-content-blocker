use crate::core::config::AppConfig;
use std::sync::atomic::{AtomicBool, AtomicU64};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<RwLock<AppConfig>>,
    pub is_admin: bool,
    pub setup_error: Arc<RwLock<Option<String>>>,
    pub watchdog_active: Arc<AtomicBool>,
    pub block_counter: Arc<AtomicU64>,
}

impl AppState {
    pub fn new(config: AppConfig, is_admin: bool) -> Self {
        let initial_blocks = config.total_blocked_attempts;
        Self {
            config: Arc::new(RwLock::new(config)),
            is_admin,
            setup_error: Arc::new(RwLock::new(None)),
            watchdog_active: Arc::new(AtomicBool::new(false)),
            block_counter: Arc::new(AtomicU64::new(initial_blocks)),
        }
    }
}
