use crate::core::config::DnsProvider;
use std::os::windows::process::CommandExt;
use std::process::Command;

const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct DnsManager;

#[cfg(test)]
mod compatibility_tests {
    use super::*;

    #[test]
    fn legacy_family_providers_use_youtube_compatible_dns() {
        for provider in [DnsProvider::CleanBrowsing, DnsProvider::AdGuard] {
            let (ipv4, _) = DnsManager::get_dns_servers(&provider);
            assert_eq!(ipv4, vec!["1.1.1.3", "1.0.0.3"]);
        }
    }
}

impl DnsManager {
    pub fn get_dns_servers(provider: &DnsProvider) -> (Vec<&'static str>, Vec<&'static str>) {
        match provider {
            // Preserve old serialized choices while avoiding YouTube-restricting resolvers.
            DnsProvider::Cloudflare | DnsProvider::CleanBrowsing | DnsProvider::AdGuard => (
                vec!["1.1.1.3", "1.0.0.3"],
                vec!["2606:4700:4700::1113", "2606:4700:4700::1003"],
            ),
        }
    }

    pub fn apply_dns(provider: &DnsProvider) -> Result<(), String> {
        let (ipv4, _ipv6) = Self::get_dns_servers(provider);
        let servers_str = ipv4
            .iter()
            .map(|s| format!("'{}'", s))
            .collect::<Vec<_>>()
            .join(",");

        let script = format!(
            r#"$ErrorActionPreference = 'Stop'; Get-NetAdapter | Where-Object {{ $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true }} | ForEach-Object {{ Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses @({}) -ErrorAction Stop }}"#,
            servers_str
        );

        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to execute DNS configuration: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell DNS configuration error: {}", err));
        }

        Self::flush_dns_cache()?;
        Ok(())
    }

    pub fn reset_dns() -> Result<(), String> {
        let script = r#"$ErrorActionPreference = 'Stop'; Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.HardwareInterface -eq $true } | ForEach-Object { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ResetServerAddresses -ErrorAction Stop }"#;

        let output = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to reset DNS: {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell DNS reset error: {}", err));
        }

        Self::flush_dns_cache()?;
        Ok(())
    }

    pub fn flush_dns_cache() -> Result<(), String> {
        let output = Command::new("ipconfig")
            .arg("/flushdns")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to flush DNS cache: {}", e))?;

        if output.status.success() {
            Ok(())
        } else {
            Err("Failed to flush DNS cache".into())
        }
    }
}
