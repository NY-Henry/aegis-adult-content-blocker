// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().any(|arg| arg == "--verify-bundle") {
        match aegis_shield_lib::verify_packaged_assets() {
            Ok(()) => std::process::exit(0),
            Err(error) => { eprintln!("{error}"); std::process::exit(1); }
        }
    }
    aegis_shield_lib::run();
}
