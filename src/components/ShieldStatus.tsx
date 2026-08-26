import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Globe,
  FileCode2,
  Lock,
  EyeOff,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { AppStatusResponse } from "../types";

interface ShieldStatusProps {
  status: AppStatusResponse;
  onToggleShield: () => void;
  onRequestUnlock: () => void;
  onCancelUnlock: () => void;
  loading: boolean;
}

export const ShieldStatus: React.FC<ShieldStatusProps> = ({
  status,
  onToggleShield,
  onRequestUnlock,
  onCancelUnlock,
  loading,
}) => {
  const isWaiting = status.cooldown_status.status === "waiting";
  const secondsRemaining = isWaiting ? (status.cooldown_status as any).seconds_remaining : 0;
  const isUnlocked = status.cooldown_status.status === "unlocked";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const getDnsName = (p: string) => {
    switch (p) {
      case "clean_browsing":
        return "CleanBrowsing Family Filter";
      case "ad_guard":
        return "AdGuard Family DNS";
      case "cloudflare":
      default:
        return "Cloudflare Family 1.1.1.3";
    }
  };

  return (
    <div className="shield-status-container">
      {/* Top Banner if not admin */}
      {!status.is_admin && (
        <div className="warning-banner">
          <AlertTriangle size={20} className="warning-icon" />
          <div className="warning-text">
            <strong>Administrator Rights Recommended:</strong>
            <span>
              {" "}System-wide Hosts file sinkhole and Windows Registry browser policies require admin rights. Click "Elevate to Admin" above.
            </span>
          </div>
        </div>
      )}

      {/* Main Shield Hero Card */}
      <div className={`hero-shield-card ${status.shield_enabled ? "shield-on" : "shield-off"}`}>
        <div className="hero-shield-glow"></div>
        <div className="hero-content">
          <div className="hero-icon-container">
            {status.shield_enabled ? (
              <ShieldCheck size={76} className="hero-shield-icon glow-pulse" />
            ) : (
              <ShieldAlert size={76} className="hero-shield-icon" />
            )}
          </div>

          <div className="hero-details">
            <h2 className="hero-title">
              {status.shield_enabled ? "Aegis Shield Armed" : "Protection Disabled"}
            </h2>
            <p className="hero-desc">
              {status.shield_enabled
                ? "All 4 defense layers are actively guarding network, DNS, browsers, and application windows."
                : "Protection is currently in standby. Adult content and private browsing are unblocked."}
            </p>
          </div>

          <div className="hero-action-box">
            {status.shield_enabled && status.unlock_delay_minutes > 0 && !isUnlocked ? (
              isWaiting ? (
                <div className="cooldown-active-box">
                  <div className="cooldown-timer-row">
                    <Clock size={18} className="spin-slow" />
                    <span>Cooldown: {formatTime(secondsRemaining)}</span>
                  </div>
                  <p className="cooldown-hint">Countdown before shield can be toggled off</p>
                  <button className="btn-cancel-cooldown" onClick={onCancelUnlock}>
                    Cancel Unlock Request
                  </button>
                </div>
              ) : (
                <button
                  className="btn-unlock-request"
                  onClick={onRequestUnlock}
                  disabled={loading}
                >
                  <Clock size={18} />
                  <span>Request Unlock ({status.unlock_delay_minutes}m delay)</span>
                </button>
              )
            ) : (
              <button
                className={`btn-master-toggle ${status.shield_enabled ? "btn-shield-disable" : "btn-shield-enable"}`}
                onClick={onToggleShield}
                disabled={loading}
              >
                {status.shield_enabled ? "Disable Shield" : "Activate Protection"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box blue">
            <Activity size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-val">{status.total_blocked_attempts.toLocaleString()}</span>
            <span className="metric-label">Access Attempts Blocked</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box green">
            <Globe size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-val">
              {status.active_blocklist_count > 0
                ? status.active_blocklist_count.toLocaleString()
                : `${status.custom_blocked_domains.length + 150}+`}
            </span>
            <span className="metric-label">Sinkholed Adult Domains</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box purple">
            <Lock size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-val">{status.has_pin ? "Protected" : "No PIN"}</span>
            <span className="metric-label">Security Lock Status</span>
          </div>
        </div>
      </div>

      {/* 4 Defense Layers Grid */}
      <div className="layers-section">
        <h3 className="section-title">Active Defense Layers</h3>
        <div className="layers-grid">
          {/* Layer 1: DNS */}
          <div className={`layer-card ${status.shield_enabled && status.dns_blocking_enabled ? "active" : ""}`}>
            <div className="layer-header">
              <div className="layer-icon-title">
                <Globe size={20} className="layer-icon" />
                <h4>1. Family DNS Resolver</h4>
              </div>
              <span className="layer-badge">
                {status.shield_enabled && status.dns_blocking_enabled ? (
                  <><CheckCircle2 size={14} /> Active</>
                ) : (
                  <><XCircle size={14} /> Off</>
                )}
              </span>
            </div>
            <p className="layer-description">
              Enforces <strong>{getDnsName(status.dns_provider)}</strong> on all network interfaces. Resolves requests to adult domains to null.
            </p>
          </div>

          {/* Layer 2: Hosts Sinkhole */}
          <div className={`layer-card ${status.shield_enabled && status.hosts_blocking_enabled ? "active" : ""}`}>
            <div className="layer-header">
              <div className="layer-icon-title">
                <FileCode2 size={20} className="layer-icon" />
                <h4>2. Hosts File Sinkhole</h4>
              </div>
              <span className="layer-badge">
                {status.shield_enabled && status.hosts_blocking_enabled ? (
                  <><CheckCircle2 size={14} /> Active</>
                ) : (
                  <><XCircle size={14} /> Off</>
                )}
              </span>
            </div>
            <p className="layer-description">
              Kernel-level domain sinkhole to <code>0.0.0.0</code> + SafeSearch VIP redirection for Google, Bing, DuckDuckGo & YouTube.
            </p>
          </div>

          {/* Layer 3: Browser Policies */}
          <div className={`layer-card ${status.shield_enabled && status.browser_policies_enabled ? "active" : ""}`}>
            <div className="layer-header">
              <div className="layer-icon-title">
                <EyeOff size={20} className="layer-icon" />
                <h4>3. Browser Lockdown</h4>
              </div>
              <span className="layer-badge">
                {status.shield_enabled && status.browser_policies_enabled ? (
                  <><CheckCircle2 size={14} /> Active</>
                ) : (
                  <><XCircle size={14} /> Off</>
                )}
              </span>
            </div>
            <p className="layer-description">
              Disables Incognito / InPrivate browsing on Chrome, Edge & Brave. Blocks DNS-over-HTTPS (DoH) bypass.
            </p>
          </div>

          {/* Layer 4: Window Watchdog */}
          <div className={`layer-card ${status.shield_enabled && status.watchdog_enabled ? "active" : ""}`}>
            <div className="layer-header">
              <div className="layer-icon-title">
                <Activity size={20} className="layer-icon" />
                <h4>4. Real-time Window Sentinel</h4>
              </div>
              <span className="layer-badge">
                {status.shield_enabled && status.watchdog_enabled ? (
                  <><CheckCircle2 size={14} /> Active</>
                ) : (
                  <><XCircle size={14} /> Off</>
                )}
              </span>
            </div>
            <p className="layer-description">
              Background watchdog scans active window titles. Closes explicit searches or illicit tabs instantly with zero lag.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
