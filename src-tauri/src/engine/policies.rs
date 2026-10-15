use winreg::enums::*;
use winreg::RegKey;

const CHROME: &str = r"SOFTWARE\Policies\Google\Chrome";
const EDGE: &str = r"SOFTWARE\Policies\Microsoft\Edge";
const BRAVE: &str = r"SOFTWARE\Policies\BraveSoftware\Brave";
const FIREFOX: &str = r"SOFTWARE\Policies\Mozilla\Firefox";

pub struct PolicyManager;

impl PolicyManager {
    /// Read-only: old versions kept no ownership record for this policy.
    pub fn youtube_policy_restricted() -> Result<bool, String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        for path in [CHROME, EDGE] {
            match hklm.open_subkey_with_flags(path, KEY_QUERY_VALUE) {
                Ok(key) => match key.get_value::<u32, _>("ForceYouTubeRestrict") {
                    Ok(value) if value > 0 => return Ok(true),
                    Ok(_) => {}
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                    Err(error) => {
                        return Err(format!("Cannot read YouTube browser policy: {error}"))
                    }
                },
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => {
                    return Err(format!("Cannot inspect YouTube browser policy: {error}"))
                }
            }
        }
        Ok(false)
    }

    /// Only called by the explicit, PIN-gated repair command, never at startup.
    pub fn restore_youtube_policies() -> Result<(), String> {
        for path in [CHROME, EDGE] {
            Self::remove_values(path, &["ForceYouTubeRestrict"])?;
        }
        Ok(())
    }

    fn remove_values(path: &str, names: &[&str]) -> Result<(), String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let key = match hklm.open_subkey_with_flags(path, KEY_SET_VALUE) {
            Ok(key) => key,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
            Err(error) => return Err(format!("Cannot update browser policy {path}: {error}")),
        };
        for name in names {
            match key.delete_value(name) {
                Ok(()) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(format!("Cannot remove browser policy {name}: {error}")),
            }
        }
        Ok(())
    }

    pub fn set_autostart(enable: bool) -> Result<(), String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu
            .create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run")
            .map_err(|error| format!("Cannot access startup settings: {error}"))?;
        if enable {
            let exe = std::env::current_exe().map_err(|error| error.to_string())?;
            key.set_value("AegisGuard", &format!("\"{}\"", exe.display()))
                .map_err(|error| format!("Cannot enable startup: {error}"))?;
        } else {
            match key.delete_value("AegisGuard") {
                Ok(()) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(format!("Cannot disable startup: {error}")),
            }
        }
        Ok(())
    }

    pub fn apply_policies() -> Result<(), String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        for (path, private_policy) in [
            (CHROME, "IncognitoModeAvailability"),
            (EDGE, "InPrivateModeAvailability"),
            (BRAVE, "IncognitoModeAvailability"),
        ] {
            let (key, _) = hklm
                .create_subkey(path)
                .map_err(|error| format!("Cannot configure browser {path}: {error}"))?;
            key.set_value(private_policy, &1u32)
                .map_err(|error| error.to_string())?;
            key.set_value("DnsOverHttpsMode", &"off")
                .map_err(|error| error.to_string())?;
            if path != BRAVE {
                key.set_value("ForceGoogleSafeSearch", &1u32)
                    .map_err(|error| error.to_string())?;
            }
            if path == EDGE {
                key.set_value("ForceSafeSearch", &1u32)
                    .map_err(|error| error.to_string())?;
            }
        }
        let (firefox, _) = hklm
            .create_subkey(FIREFOX)
            .map_err(|error| error.to_string())?;
        firefox
            .set_value("DisablePrivateBrowsing", &1u32)
            .map_err(|error| error.to_string())?;
        Self::set_autostart(true)
    }

    pub fn remove_policies() -> Result<(), String> {
        Self::remove_values(
            CHROME,
            &[
                "IncognitoModeAvailability",
                "ForceGoogleSafeSearch",
                "DnsOverHttpsMode",
            ],
        )?;
        Self::remove_values(
            EDGE,
            &[
                "InPrivateModeAvailability",
                "ForceGoogleSafeSearch",
                "ForceSafeSearch",
                "DnsOverHttpsMode",
            ],
        )?;
        Self::remove_values(BRAVE, &["IncognitoModeAvailability", "DnsOverHttpsMode"])?;
        Self::remove_values(FIREFOX, &["DisablePrivateBrowsing"])?;
        Self::set_autostart(false)
    }
}
