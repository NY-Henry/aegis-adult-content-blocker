import { useEffect, useState } from "react";
import { Check, Play as Youtube, Save, Shield } from "lucide-react";
import { AppStatusResponse, UpdateSettingsPayload } from "../types";
import { errorMessage } from "../utils";
interface Props {
  onDirtyChange: (dirty: boolean) => void;
  status: AppStatusResponse; onUpdateSettings: (payload: UpdateSettingsPayload) => Promise<void>;
  onOpenSetPin: () => void; onRemovePin: () => Promise<void>; onResetStats: () => Promise<void>;
}
const settingsFrom = (status: AppStatusResponse): UpdateSettingsPayload => ({
  dns_provider: "cloudflare", dns_blocking_enabled: status.dns_blocking_enabled, hosts_blocking_enabled: status.hosts_blocking_enabled,
  browser_policies_enabled: status.browser_policies_enabled, watchdog_enabled: status.watchdog_enabled, unlock_delay_minutes: status.unlock_delay_minutes,
});
export function Settings({ status, onUpdateSettings, onOpenSetPin, onRemovePin, onResetStats, onDirtyChange }: Props) {
  const [draft, setDraft] = useState(() => settingsFrom(status));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settingsFrom(status));
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  const save = async () => {
    setSaving(true); setMessage(null);
    try { await onUpdateSettings(draft); setMessage({ text: "Settings saved.", error: false }); }
    catch (error) { if (errorMessage(error) !== "Action cancelled.") setMessage({ text: errorMessage(error), error: true }); }
    finally { setSaving(false); }
  };
  const controls = [
    { key: "dns_blocking_enabled", name: "Adult content DNS", description: "Use Cloudflare's adult-domain filter. YouTube-restricting family resolvers are excluded." },
    { key: "hosts_blocking_enabled", name: "Blocked sites and SafeSearch", description: "Block listed domains and enable search engine SafeSearch. YouTube domains are always excluded." },
    { key: "browser_policies_enabled", name: "Browser protection", description: "Disable private browsing and DNS bypass. No forced YouTube Restricted Mode." },
    { key: "watchdog_enabled", name: "Window monitoring", description: "Optional: closes whole windows when their titles match a keyword. Identifiable YouTube windows are excluded." },
  ] as const;
  return <div className="settings-container">
    {message && <div className={"notice " + (message.error ? "error-notice" : "success-notice")} role={message.error ? "alert" : "status"}><span>{message.text}</span></div>}
    <section className="panel"><div className="panel-heading"><div><h2>Protection preferences</h2><p>Choose the layers that run when protection is enabled.</p></div><Shield size={18} /></div><div className="settings-body">
      {controls.map(({ key, name, description }) => <label className="setting-row" key={key}><div className="setting-copy"><strong>{name}</strong><p>{description}</p></div><input className="switch" type="checkbox" role="switch" aria-label={name} checked={draft[key]} disabled={saving} onChange={event => { setDraft({ ...draft, [key]: event.target.checked }); setMessage(null); }} /></label>)}
      <p className="helper-text">DNS provider: Cloudflare adult content filter · 1.1.1.3 / 1.0.0.3. Existing restrictive family-provider choices are migrated automatically.</p>
    </div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Pausing protection</h2><p>A waiting period gives you time to reconsider a pause.</p></div></div><div className="settings-body"><div className="setting-row"><div className="setting-copy"><strong>Pause delay</strong><p>The timer starts only after you request a pause.</p></div><select className="select-input" aria-label="Pause delay" value={draft.unlock_delay_minutes} disabled={saving} onChange={event => { setDraft({ ...draft, unlock_delay_minutes: Number(event.target.value) }); setMessage(null); }}>
      {[0, 5, 15, 30, 60, 1440].map(minutes => <option key={minutes} value={minutes}>{minutes === 0 ? "No delay" : minutes === 60 ? "1 hour" : minutes === 1440 ? "24 hours" : minutes + " minutes"}</option>)}
    </select></div></div></section>
    <section className="panel"><div className="panel-heading"><div><h2>Security PIN</h2><p>A PIN protects settings and pause requests.</p></div><span className={"badge " + (status.has_pin ? "success" : "neutral")}>{status.has_pin ? "PIN set" : "Not set"}</span></div><div className="settings-body"><div className="setting-row"><div className="action-group"><button className="btn-secondary" onClick={onOpenSetPin} disabled={saving}>{status.has_pin ? "Change PIN" : "Set a PIN"}</button>{status.has_pin && <button className="btn-danger-outline" onClick={() => { void onRemovePin().catch(error => setMessage({ text: errorMessage(error), error: true })); }} disabled={saving}>Remove PIN</button>}</div><button className="text-button" onClick={() => { void onResetStats().catch(error => { if (errorMessage(error) !== "Action cancelled.") setMessage({ text: errorMessage(error), error: true }); }); }} disabled={saving}>Reset blocked counter</button></div></div></section>
    <div className="youtube-banner"><Youtube size={22} /><div><h3>YouTube is excluded from Aegis protection rules.</h3><p>Old Aegis hosts redirects are cleaned up on an administrator launch. If an existing browser policy is detected, use Restore YouTube above. Other network or account restrictions may still apply.</p></div><span className={"badge " + (status.youtube_policy_restricted ? "warning" : "neutral")}><Check size={11} />{status.youtube_policy_restricted ? "Needs repair" : "Preserved"}</span></div>
    {dirty && <div className="settings-save-bar" role="status"><span>Unsaved changes</span><div className="action-group"><button className="btn-secondary" disabled={saving} onClick={() => setDraft(settingsFrom(status))}>Discard</button><button className="btn-primary" onClick={() => { void save(); }} disabled={saving}><Save size={14} />{saving ? "Saving..." : "Save changes"}</button></div></div>}
  </div>;
}
