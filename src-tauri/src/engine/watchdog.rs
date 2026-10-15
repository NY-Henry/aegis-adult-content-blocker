use crate::core::config::AppConfig;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, PostMessageW, ShowWindow, SW_MINIMIZE, WM_CLOSE,
};

pub struct WatchdogSentinel;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn excludes_youtube_windows_without_exempting_lookalike_titles() {
        assert!(WatchdogSentinel::is_youtube_title(
            "adult video documentary - YouTube - Google Chrome"
        ));
        assert!(WatchdogSentinel::is_youtube_title(
            "A song – YouTube Music — Microsoft Edge"
        ));
        assert!(!WatchdogSentinel::is_youtube_title(
            "YouTube downloader - example.com - Chrome"
        ));
    }
}

impl WatchdogSentinel {
    pub fn start(
        config_lock: Arc<RwLock<AppConfig>>,
        active_flag: Arc<AtomicBool>,
        block_counter: Arc<AtomicU64>,
    ) {
        if active_flag.swap(true, Ordering::SeqCst) {
            // Already running
            return;
        }

        tauri::async_runtime::spawn(async move {
            let mut buffer = [0u16; 512];

            while active_flag.load(Ordering::SeqCst) {
                tokio::time::sleep(Duration::from_millis(400)).await;

                // Read config snapshot
                let (enabled, keywords, custom_domains) = {
                    let cfg = config_lock.read().await;
                    (
                        cfg.shield_enabled && cfg.watchdog_enabled,
                        cfg.blocked_keywords.clone(),
                        cfg.custom_blocked_domains.clone(),
                    )
                };

                if !enabled {
                    continue;
                }

                unsafe {
                    let hwnd = GetForegroundWindow();
                    if hwnd == std::ptr::null_mut() {
                        continue;
                    }

                    let len = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
                    if len <= 0 {
                        continue;
                    }

                    let title = String::from_utf16_lossy(&buffer[..len as usize]).to_lowercase();

                    // Do not block our own app!
                    if title.contains("aegis guard")
                        || title.contains("site-blocker")
                        || Self::is_youtube_title(&title)
                    {
                        continue;
                    }

                    // Check for keyword triggers
                    let keyword_match = keywords.iter().any(|k| {
                        let k_clean = k.trim().to_lowercase();
                        !k_clean.is_empty() && title.contains(&k_clean)
                    });

                    // Check for domain triggers in title
                    let domain_match = custom_domains.iter().any(|d| {
                        let d_clean = d.trim().to_lowercase();
                        !d_clean.is_empty() && title.contains(&d_clean)
                    });

                    if keyword_match || domain_match {
                        // Action: Send close message or minimize window
                        PostMessageW(hwnd, WM_CLOSE, 0, 0);
                        ShowWindow(hwnd, SW_MINIMIZE);

                        // Increment block counter
                        block_counter.fetch_add(1, Ordering::SeqCst);

                        // Save new count to config
                        {
                            let mut cfg = config_lock.write().await;
                            cfg.total_blocked_attempts += 1;
                            let _ = cfg.save();
                        }

                        // Prevent rapid multi-closing
                        tokio::time::sleep(Duration::from_millis(800)).await;
                    }
                }
            }
        });
    }

    pub fn stop(active_flag: Arc<AtomicBool>) {
        active_flag.store(false, Ordering::SeqCst);
    }

    pub fn is_youtube_title(title: &str) -> bool {
        title
            .to_lowercase()
            .replace(" – ", " - ")
            .replace(" — ", " - ")
            .replace(" | ", " - ")
            .split(" - ")
            .any(|part| matches!(part.trim(), "youtube" | "youtube music"))
    }
}
