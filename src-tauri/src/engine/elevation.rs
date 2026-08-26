use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::ptr;
use windows_sys::Win32::UI::Shell::IsUserAnAdmin;
use windows_sys::Win32::UI::Shell::ShellExecuteW;
use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOW;

pub fn is_elevated() -> bool {
    unsafe { IsUserAnAdmin() != 0 }
}

pub fn relaunch_as_admin() -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_path_wide: Vec<u16> = current_exe.as_os_str().encode_wide().chain(Some(0)).collect();
    let verb_wide: Vec<u16> = OsStr::new("runas").encode_wide().chain(Some(0)).collect();

    unsafe {
        let result = ShellExecuteW(
            ptr::null_mut(),
            verb_wide.as_ptr(),
            exe_path_wide.as_ptr(),
            ptr::null(),
            ptr::null(),
            SW_SHOW,
        );

        if (result as isize) > 32 {
            #[cfg(not(debug_assertions))]
            {
                // In production, exit the un-elevated process as the standalone elevated process takes over
                std::process::exit(0);
            }

            #[cfg(debug_assertions)]
            {
                // In dev mode (tauri dev), don't kill Vite. Let the user know to launch their terminal as Admin.
                Err("In development mode (`npm run tauri dev`), please open your terminal/PowerShell as Administrator so the Vite server remains connected to the elevated window.".into())
            }
        } else {
            Err(format!("Failed to elevate process. ShellExecute error code: {}", result as isize))
        }
    }
}
