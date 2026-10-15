pub mod commands;
pub mod core;
pub mod engine;

#[cfg(all(not(debug_assertions), dev))]
compile_error!("Release builds require production assets. Use npm run tauri build or cargo build --release --features custom-protocol.");

/// Validate the packaged frontend without starting protection or opening a window.
pub fn verify_packaged_assets() -> Result<(), String> {
    if tauri::is_dev() { return Err("Production asset protocol is missing; rebuild with --features custom-protocol.".into()); }
    let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
    let key = tauri::utils::assets::AssetKey::from("index.html");
    match context.assets().get(&key) {
        Some(html) if !html.is_empty() => Ok(()),
        _ => Err("The packaged dashboard is missing.".into()),
    }
}

#[cfg(test)]
mod packaging_tests {
    #[test]
    #[ignore = "Run explicitly with the production asset feature"]
    fn packaged_dashboard_is_embedded() {
        assert!(super::verify_packaged_assets().is_ok(), "Packaged app must use embedded dashboard assets, not localhost");
    }
}

use commands::*;
use core::config::AppConfig;
use core::state::AppState;
use engine::elevation::is_elevated;
use engine::hosts::HostsManager;
use engine::watchdog::WatchdogSentinel;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

pub fn run() {
    let mut config = AppConfig::load();
    let is_admin = is_elevated();
    let mut setup_errors = Vec::new();
    if is_admin {
        if let Err(error) = HostsManager::remove_legacy_youtube_overrides() {
            setup_errors.push(error);
        }
        if config.shield_enabled {
            if let Err(error) = enforce_protection_rules(&mut config) {
                setup_errors.push(error);
            }
        }
    }
    let mut state = AppState::new(config, is_admin);
    if !setup_errors.is_empty() {
        state.setup_error =
            std::sync::Arc::new(tokio::sync::RwLock::new(Some(setup_errors.join("; "))));
    }

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

            let open = MenuItem::with_id(app, "open", "Open dashboard", true, None::<&str>)?;
            let pause = MenuItem::with_id(app, "pause", "Pause protection...", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(
                app,
                "quit",
                "Quit app (keep site blocking)",
                true,
                None::<&str>,
            )?;
            let menu = Menu::with_items(app, &[&open, &pause, &separator, &quit])?;
            let mut tray_builder = TrayIconBuilder::with_id("aegis-tray")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Aegis Guard — Open dashboard")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" | "pause" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                        if event.id.as_ref() == "pause" {
                            let _ = app.emit("tray-action", "pause");
                        }
                    }
                    "quit" => {
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            // The command waits for any settings write to finish.
                            let state = handle.state::<AppState>();
                            if let Err(error) = quit_app(handle.clone(), state).await {
                                *handle.state::<AppState>().setup_error.write().await = Some(format!("Could not quit: {error}"));
                                if let Some(window) = handle.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        });
                    }
                    _ => {}
                })
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
                });
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let tray_result = tray_builder.build(app);
            let tray_available = tray_result.is_ok();

            if let Err(e) = tray_result {
                eprintln!("Tray build warning: {}", e);
            }

            // Never hide the user's only window if the tray could not be created.
            if let Some(w) = window.filter(|_| tray_available) {
                let win_clone = w.clone();
                w.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            let handle = app.handle().clone();
            let config_lock = state.config.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let enabled = config_lock.read().await.shield_enabled;
                    if let Some(tray) = handle.tray_by_id("aegis-tray") {
                        let _ = tray.set_tooltip(Some(if enabled {
                            "Aegis Guard — Protection enabled"
                        } else {
                            "Aegis Guard — Protection paused"
                        }));
                    }
                    tokio::time::sleep(std::time::Duration::from_secs(4)).await;
                }
            });

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
            reset_stats,
            quit_app,
            restore_youtube
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aegis Guard application");
}
