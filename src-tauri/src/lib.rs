pub mod commands;
pub mod core;
pub mod engine;

use commands::*;
use core::config::AppConfig;
use core::state::AppState;
use engine::dns::DnsManager;
use engine::elevation::is_elevated;
use engine::hosts::HostsManager;
use engine::policies::PolicyManager;
use engine::watchdog::WatchdogSentinel;
use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn run() {
    let config = AppConfig::load();
    let is_admin = is_elevated();

    // If running as Admin and shield is active, apply baseline protection immediately on boot
    if is_admin && config.shield_enabled {
        if config.dns_blocking_enabled {
            let _ = DnsManager::apply_dns(&config.dns_provider);
        }
        if config.hosts_blocking_enabled {
            let _ = HostsManager::apply_hosts_blocklist(&config.custom_blocked_domains, None);
        }
        if config.browser_policies_enabled {
            let _ = PolicyManager::apply_policies();
        }
    }

    let state = AppState::new(config, is_admin);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state.clone())
        .setup(move |app| {
            let window = app.get_webview_window("main");

            // Start background watchdog inside Tauri's active async runtime
            WatchdogSentinel::start(
                state.config.clone(),
                state.watchdog_active.clone(),
                state.block_counter.clone(),
            );

            // Setup system tray
            let tray_result = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Aegis Guard — Protection Active")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app);

            if let Err(e) = tray_result {
                eprintln!("Tray build warning: {}", e);
            }

            // Intercept window close to minimize to tray instead of exiting
            if let Some(w) = window {
                let win_clone = w.clone();
                w.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            toggle_shield,
            request_unlock,
            cancel_unlock,
            set_pin,
            remove_pin,
            update_settings,
            add_blocked_domain,
            remove_blocked_domain,
            add_blocked_keyword,
            remove_blocked_keyword,
            sync_blocklist,
            relaunch_admin,
            reset_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aegis Guard application");
}
