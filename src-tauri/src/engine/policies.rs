use winreg::enums::*;
use winreg::RegKey;

pub struct PolicyManager;

impl PolicyManager {
    pub fn set_autostart(enable: bool) -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        if let Ok((run_key, _)) = hkcu.create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run") {
            if enable {
                if let Ok(current_exe) = std::env::current_exe() {
                    let exe_str = current_exe.to_string_lossy().to_string();
                    let _ = run_key.set_value("AegisGuard", &exe_str);
                }
            } else {
                let _ = run_key.delete_value("AegisGuard");
            }
        }
        Ok(())
    }

    pub fn apply_policies() -> Result<(), String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        // 1. Google Chrome Policies
        if let Ok((chrome_key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Google\Chrome") {
            let _ = chrome_key.set_value("IncognitoModeAvailability", &1u32); // 1 = Disabled
            let _ = chrome_key.set_value("ForceGoogleSafeSearch", &1u32);
            let _ = chrome_key.set_value("ForceYouTubeRestrict", &2u32); // 2 = Strict
            let _ = chrome_key.set_value("DnsOverHttpsMode", &"off"); // Prevent DoH bypass
        }

        // 2. Microsoft Edge Policies
        if let Ok((edge_key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Microsoft\Edge") {
            let _ = edge_key.set_value("InPrivateModeAvailability", &1u32);
            let _ = edge_key.set_value("ForceGoogleSafeSearch", &1u32);
            let _ = edge_key.set_value("ForceSafeSearch", &1u32);
            let _ = edge_key.set_value("ForceYouTubeRestrict", &2u32);
            let _ = edge_key.set_value("DnsOverHttpsMode", &"off");
        }

        // 3. Brave Browser Policies
        if let Ok((brave_key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\BraveSoftware\Brave") {
            let _ = brave_key.set_value("IncognitoModeAvailability", &1u32);
            let _ = brave_key.set_value("DnsOverHttpsMode", &"off");
        }

        // 4. Mozilla Firefox Policies
        if let Ok((firefox_key, _)) = hklm.create_subkey(r"SOFTWARE\Policies\Mozilla\Firefox") {
            let _ = firefox_key.set_value("DisablePrivateBrowsing", &1u32);
        }

        // 5. Register Auto-start on boot
        let _ = Self::set_autostart(true);

        Ok(())
    }

    pub fn remove_policies() -> Result<(), String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

        if let Ok(chrome_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Google\Chrome", KEY_SET_VALUE) {
            let _ = chrome_key.delete_value("IncognitoModeAvailability");
            let _ = chrome_key.delete_value("ForceGoogleSafeSearch");
            let _ = chrome_key.delete_value("ForceYouTubeRestrict");
            let _ = chrome_key.delete_value("DnsOverHttpsMode");
        }

        if let Ok(edge_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Microsoft\Edge", KEY_SET_VALUE) {
            let _ = edge_key.delete_value("InPrivateModeAvailability");
            let _ = edge_key.delete_value("ForceGoogleSafeSearch");
            let _ = edge_key.delete_value("ForceSafeSearch");
            let _ = edge_key.delete_value("ForceYouTubeRestrict");
            let _ = edge_key.delete_value("DnsOverHttpsMode");
        }

        if let Ok(brave_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\BraveSoftware\Brave", KEY_SET_VALUE) {
            let _ = brave_key.delete_value("IncognitoModeAvailability");
            let _ = brave_key.delete_value("DnsOverHttpsMode");
        }

        if let Ok(firefox_key) = hklm.open_subkey_with_flags(r"SOFTWARE\Policies\Mozilla\Firefox", KEY_SET_VALUE) {
            let _ = firefox_key.delete_value("DisablePrivateBrowsing");
        }

        let _ = Self::set_autostart(false);

        Ok(())
    }
}
