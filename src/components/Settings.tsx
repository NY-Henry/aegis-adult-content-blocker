import React, { useState } from "react";
import {
  Shield,
  Lock,
  Globe,
  Clock,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { AppStatusResponse, DnsProvider, UpdateSettingsPayload } from "../types";

interface SettingsProps {
  status: AppStatusResponse;
  onUpdateSettings: (payload: UpdateSettingsPayload) => Promise<void>;
  onOpenSetPin: () => void;
  onRemovePin: () => Promise<void>;
  onResetStats: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  status,
  onUpdateSettings,
  onOpenSetPin,
  onRemovePin,
  onResetStats,
}) => {
  const [dnsProvider, setDnsProvider] = useState<DnsProvider>(status.dns_provider);
  const [dnsEnabled, setDnsEnabled] = useState(status.dns_blocking_enabled);
  const [hostsEnabled, setHostsEnabled] = useState(status.hosts_blocking_enabled);
  const [policiesEnabled, setPoliciesEnabled] = useState(status.browser_policies_enabled);
  const [watchdogEnabled, setWatchdogEnabled] = useState(status.watchdog_enabled);
  const [unlockDelay, setUnlockDelay] = useState(status.unlock_delay_minutes);
  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdateSettings({
        dns_provider: dnsProvider,
        dns_blocking_enabled: dnsEnabled,
        hosts_blocking_enabled: hostsEnabled,
        browser_policies_enabled: policiesEnabled,
        watchdog_enabled: watchdogEnabled,
        unlock_delay_minutes: unlockDelay,
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-container">
      {savedMsg && (
        <div className="success-toast">
          <CheckCircle2 size={18} />
          <span>Settings applied and saved successfully!</span>
        </div>
      )}

      <div className="settings-section-card">
        <div className="settings-card-header">
          <Globe size={20} />
          <div>
            <h4>DNS Protection Provider</h4>
            <p>Select which family-safe resolver encrypts and filters domain requests system-wide.</p>
          </div>
        </div>

        <div className="dns-options-grid">
          <label className={`dns-option-card ${dnsProvider === "cloudflare" ? "selected" : ""}`}>
            <input
              type="radio"
              name="dns_provider"
              value="cloudflare"
              checked={dnsProvider === "cloudflare"}
              onChange={() => setDnsProvider("cloudflare")}
            />
            <div className="dns-option-body">
              <strong>Cloudflare Family (1.1.1.3)</strong>
              <span>Fastest resolution. Blocks malware, phishing, and adult content automatically.</span>
            </div>
          </label>

          <label className={`dns-option-card ${dnsProvider === "clean_browsing" ? "selected" : ""}`}>
            <input
              type="radio"
              name="dns_provider"
              value="clean_browsing"
              checked={dnsProvider === "clean_browsing"}
              onChange={() => setDnsProvider("clean_browsing")}
            />
            <div className="dns-option-body">
              <strong>CleanBrowsing Family</strong>
              <span>Strict content filtering with SafeSearch enforcement baked into DNS.</span>
            </div>
          </label>

          <label className={`dns-option-card ${dnsProvider === "ad_guard" ? "selected" : ""}`}>
            <input
              type="radio"
              name="dns_provider"
              value="ad_guard"
              checked={dnsProvider === "ad_guard"}
              onChange={() => setDnsProvider("ad_guard")}
            />
            <div className="dns-option-body">
              <strong>AdGuard Family Protection</strong>
              <span>Blocks adult websites, malicious domains, and common tracking trackers.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="settings-section-card">
        <div className="settings-card-header">
          <Clock size={20} />
          <div>
            <h4>Unlock Delay Cooldown (Anti-Relapse Friction)</h4>
            <p>
              When you attempt to disable protection, you must wait this cooldown period before the toggle activates.
            </p>
          </div>
        </div>

        <div className="setting-control-row">
          <label className="setting-label">Cooldown Waiting Period:</label>
          <select
            value={unlockDelay}
            onChange={(e) => setUnlockDelay(Number(e.target.value))}
            className="select-input"
          >
            <option value={0}>Instant (No delay)</option>
            <option value={5}>5 Minutes</option>
            <option value={15}>15 Minutes (Recommended)</option>
            <option value={30}>30 Minutes</option>
            <option value={60}>1 Hour</option>
            <option value={1440}>24 Hours (Extreme Lockdown)</option>
          </select>
        </div>
      </div>

      <div className="settings-section-card">
        <div className="settings-card-header">
          <Shield size={20} />
          <div>
            <h4>Individual Defense Layer Toggles</h4>
            <p>Customize which protection layers are active when Aegis Shield is armed.</p>
          </div>
        </div>

        <div className="toggle-list">
          <label className="toggle-item">
            <div className="toggle-info">
              <strong>Network Family DNS Resolver</strong>
              <span>Overrides network adapter DNS servers with family filtering.</span>
            </div>
            <input
              type="checkbox"
              checked={dnsEnabled}
              onChange={(e) => setDnsEnabled(e.target.checked)}
              className="toggle-checkbox"
            />
          </label>

          <label className="toggle-item">
            <div className="toggle-info">
              <strong>Hosts File Domain Sinkhole & SafeSearch VIPs</strong>
              <span>Redirects adult domains and search engines to 0.0.0.0 and strict VIPs.</span>
            </div>
            <input
              type="checkbox"
              checked={hostsEnabled}
              onChange={(e) => setHostsEnabled(e.target.checked)}
              className="toggle-checkbox"
            />
          </label>

          <label className="toggle-item">
            <div className="toggle-info">
              <strong>Browser Policies & Anti-DoH Lock</strong>
              <span>Disables Incognito mode and prevents browsers from bypassing DNS.</span>
            </div>
            <input
              type="checkbox"
              checked={policiesEnabled}
              onChange={(e) => setPoliciesEnabled(e.target.checked)}
              className="toggle-checkbox"
            />
          </label>

          <label className="toggle-item">
            <div className="toggle-info">
              <strong>Real-Time Window Title Watchdog</strong>
              <span>Actively inspects foreground window titles and closes trigger tabs.</span>
            </div>
            <input
              type="checkbox"
              checked={watchdogEnabled}
              onChange={(e) => setWatchdogEnabled(e.target.checked)}
              className="toggle-checkbox"
            />
          </label>
        </div>

        <div className="settings-actions-footer">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving Changes..." : "Save Protection Settings"}
          </button>
        </div>
      </div>

      {/* Security PIN & Stats Management */}
      <div className="settings-section-card">
        <div className="settings-card-header">
          <Lock size={20} />
          <div>
            <h4>Security & PIN Protection</h4>
            <p>Require a master PIN before changing settings or disabling the shield.</p>
          </div>
        </div>

        <div className="pin-management-actions">
          <button className="btn-secondary" onClick={onOpenSetPin}>
            {status.has_pin ? "Change Master PIN" : "Set Master Security PIN"}
          </button>
          {status.has_pin && (
            <button className="btn-danger-outline" onClick={onRemovePin}>
              Remove PIN Protection
            </button>
          )}
          <button className="btn-secondary" onClick={onResetStats}>
            <RotateCcw size={15} />
            <span>Reset Blocked Counter</span>
          </button>
        </div>
      </div>
    </div>
  );
};
