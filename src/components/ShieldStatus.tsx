import { Activity, ArrowRight, Check, Clock, FileText, Globe, LockKeyhole, Monitor, Play as Youtube, ShieldCheck, ShieldOff } from "lucide-react";
import { AppStatusResponse } from "../types";
interface Props { status: AppStatusResponse; onToggleShield: () => void; onRequestUnlock: () => void; onCancelUnlock: () => void; loading: boolean; }
export function ShieldStatus({ status, onToggleShield, onRequestUnlock, onCancelUnlock, loading }: Props) {
  const waiting = status.cooldown_status.status === "waiting";
  const unlocked = status.cooldown_status.status === "unlocked" || status.cooldown_status.status === "no_cooldown_required";
  const seconds = status.cooldown_status.status === "waiting" ? status.cooldown_status.seconds_remaining : 0;
  const layers = [
    { icon: Globe, name: "Adult content DNS", detail: "Filters adult and malicious domains using Cloudflare.", enabled: status.dns_blocking_enabled, admin: true },
    { icon: FileText, name: "Blocked sites", detail: "Blocks your site list and enables search engine SafeSearch.", enabled: status.hosts_blocking_enabled, admin: true },
    { icon: LockKeyhole, name: "Browser protection", detail: "Controls private browsing and DNS bypass. Leaves YouTube alone.", enabled: status.browser_policies_enabled, admin: true },
    { icon: Monitor, name: "Window monitoring", detail: "Optional title matching. Identifiable YouTube windows are excluded.", enabled: status.watchdog_enabled, admin: false },
  ];
  const enabledCount = layers.filter(layer => layer.enabled && status.shield_enabled).length;
  return <div className="dashboard">
    {!status.is_admin && <div className="notice warning-notice"><ShieldOff size={18} /><span>Run as administrator to apply network, site, and browser protection. Window monitoring can run without it.</span></div>}
    <section className={"protection-card " + (status.shield_enabled ? "enabled" : "paused")}>
      <div className="protection-summary"><span className="protection-icon">{status.shield_enabled ? <ShieldCheck size={28} /> : <ShieldOff size={28} />}</span><div>
        <div className="title-with-badge"><h2>{status.shield_enabled ? "Protection enabled" : "Protection paused"}</h2><span className={"badge " + (status.shield_enabled ? "success" : "neutral")}>{status.shield_enabled ? "Enabled" : "Paused"}</span></div>
        <p>{status.shield_enabled ? enabledCount + " of 4 protection layers enabled. You're in control of each one." : "Blocking is turned off. Enable protection whenever you're ready."}</p>
      </div></div>
      <div className="protection-controls">{status.shield_enabled && status.unlock_delay_minutes > 0 && !unlocked ? waiting
        ? <div className="cooldown-box"><span><Clock size={15} />Pause available in {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span><button className="text-button" onClick={onCancelUnlock} disabled={loading}>Cancel request</button></div>
        : <button id="protection-action" className="btn-secondary" onClick={onRequestUnlock} disabled={loading}><Clock size={15} />Request pause<ArrowRight size={15} /></button>
        : <button id="protection-action" className={status.shield_enabled ? "btn-secondary" : "btn-primary"} onClick={onToggleShield} disabled={loading}>{loading ? "Applying..." : status.shield_enabled ? "Pause protection" : "Enable protection"}</button>}
      </div>
    </section>
    <div className="metrics-grid">
      <div className="metric-card"><span className="metric-label"><Activity size={15} />Windows blocked</span><strong>{status.total_blocked_attempts.toLocaleString()}</strong><span className="metric-help">Window monitoring events</span></div>
      <div className="metric-card"><span className="metric-label"><Globe size={15} />Domain rules</span><strong>{status.active_blocklist_count > 0 ? status.active_blocklist_count.toLocaleString() : "Built-in list"}</strong><span className="metric-help">{status.custom_blocked_domains.length} custom sites added</span></div>
      <div className="metric-card"><span className="metric-label"><LockKeyhole size={15} />Settings security</span><strong className="metric-text">{status.has_pin ? "PIN protected" : "No PIN set"}</strong><span className="metric-help">{status.unlock_delay_minutes > 0 ? status.unlock_delay_minutes + " minute pause delay" : "No pause delay"}</span></div>
    </div>
    <section className="panel"><div className="panel-heading"><div><h2>Protection layers</h2><p>Individual controls live in Settings.</p></div><span className="badge neutral">{enabledCount} / 4 enabled</span></div><div className="layer-table">
      {layers.map(({ icon: Icon, name, detail, enabled, admin }) => {
        const active = status.shield_enabled && enabled;
        const needsAdmin = active && admin && !status.is_admin;
        return <div className="layer-row" key={name}><span className="layer-icon"><Icon size={19} /></span><div className="layer-copy"><h3>{name}</h3><p>{detail}</p></div><span className={"badge " + (needsAdmin ? "warning" : active ? "success" : "neutral")}>{needsAdmin ? "Needs admin" : active ? <><Check size={12} />Enabled</> : "Off"}</span></div>;
      })}
    </div></section>
    <div className="youtube-banner"><span className="youtube-icon"><Youtube size={23} /></span><div><h3>YouTube is excluded from Aegis rules.</h3><p>Aegis does not force Restricted Mode or redirect YouTube. Existing browser restrictions can be restored using the repair action above.</p></div><span className={"badge " + (status.youtube_policy_restricted ? "warning" : "neutral")}>{status.youtube_policy_restricted ? "Needs repair" : "Excluded"}</span></div>
  </div>;
}
