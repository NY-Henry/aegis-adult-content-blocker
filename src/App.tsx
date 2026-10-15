import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AlertCircle, LayoutDashboard, ListFilter, LogOut, Play as Youtube, Shield, Sliders, X } from "lucide-react";
import { Header } from "./components/Header";
import { ShieldStatus } from "./components/ShieldStatus";
import { CustomRules } from "./components/CustomRules";
import { Settings } from "./components/Settings";
import { PinModal } from "./components/PinModal";
import { AppStatusResponse, SyncResult, UpdateSettingsPayload } from "./types";
import { errorMessage } from "./utils";
import { useDialogFocus } from "./useDialogFocus";
import "./App.css";

type Page = "dashboard" | "rules" | "settings";
const pages = {
  dashboard: ["Overview", "Your protection, at a glance."],
  rules: ["Blocked sites", "Manage the sites and keywords you want to block."],
  settings: ["Settings", "Choose how protection works on your computer."],
};
type PinDialog = { title: string; subtitle: string; isNew: boolean; confirm: (pin: string, newPin?: string) => Promise<void> };

export default function App() {
  const [status, setStatus] = useState<AppStatusResponse | null>(null);
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [pendingPage, setPendingPage] = useState<Page | null>(null);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  dirtyRef.current = settingsDirty;
  busyRef.current = busy;
  const [pinModal, setPinModal] = useState<PinDialog | null>(null);
  const pendingPin = useRef<((reason: Error) => void) | null>(null);
  const popupRef = useRef<HTMLElement>(null);
  useDialogFocus(popupRef, quitOpen || repairOpen || pendingPage !== null, () => { setQuitOpen(false); setRepairOpen(false); setPendingPage(null); }, busy);
  const fetchStatus = useCallback(async () => {
    try { const next = await invoke<AppStatusResponse>("get_status"); setStatus(next); return next; }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const refresh = () => { void fetchStatus().catch(reason => setError("Unable to read protection status. " + errorMessage(reason))); };
    refresh();
    const timer = setInterval(refresh, status?.cooldown_status.status === "waiting" ? 1000 : 4000);
    return () => clearInterval(timer);
  }, [fetchStatus, status?.cooldown_status.status]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<string>("tray-action", event => {
      if (event.payload === "pause" && !busyRef.current) { if (dirtyRef.current) setPendingPage("dashboard"); else setActivePage("dashboard"); setError(null); }
    }).then(fn => { if (disposed) fn(); else unlisten = fn; }).catch(() => { /* Browser previews have no native tray. */ });
    return () => { disposed = true; unlisten?.(); };
  }, []);

  const withPin = async (description: string, action: (pin?: string) => Promise<unknown>) => {
    if (!status?.has_pin) { await action(); return; }
    await new Promise<void>((resolve, reject) => {
      pendingPin.current = reject;
      setPinModal({
        title: "Enter your PIN", subtitle: "Enter your security PIN to " + description + ".", isNew: false,
        confirm: async pin => { await action(pin); pendingPin.current = null; resolve(); },
      });
    });
  };
  const mutate = async (operation: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await operation(); await fetchStatus(); } finally { setBusy(false); }
  };
  const run = (operation: () => Promise<unknown>) => {
    void mutate(operation).catch(reason => { if (errorMessage(reason) !== "Action cancelled.") setError(errorMessage(reason)); });
  };
  const cancelPin = () => { pendingPin.current?.(new Error("Action cancelled.")); pendingPin.current = null; setPinModal(null); };
  const protectedAction = (description: string, command: string, args: Record<string, unknown>) =>
    mutate(() => withPin(description, pin => invoke(command, { ...args, pin: pin ?? null })));
  const setPin = () => setPinModal({
    title: status?.has_pin ? "Change security PIN" : "Set a security PIN",
    subtitle: "Use at least four characters. Your PIN protects settings and pause requests.", isNew: true,
    confirm: async (currentPin, newPin) => { await invoke("set_pin", { currentPin: currentPin || null, newPin }); await fetchStatus(); },
  });
  const removePin = () => setPinModal({
    title: "Remove security PIN", subtitle: "Enter your current PIN. Settings will no longer require a PIN.", isNew: false,
    confirm: async currentPin => { await invoke("remove_pin", { currentPin }); await fetchStatus(); },
  });
  const refresh = () => { setLoading(true); setError(null); void fetchStatus().catch(reason => setError(errorMessage(reason))); };
  const navigate = (page: Page) => { if (busy) return; if (activePage === "settings" && settingsDirty && page !== "settings") setPendingPage(page); else setActivePage(page); };

  return <div className="app-layout">
    <aside className="sidebar">
      <button className="sidebar-brand" disabled={busy} onClick={() => navigate("dashboard")}><span className="brand-mark"><Shield size={19} /></span><span>Aegis Guard</span></button>
      <div className="workspace-label"><span className="workspace-avatar">P</span><div><strong>Personal workspace</strong><span>This computer</span></div></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Main navigation">{([["dashboard", LayoutDashboard], ["rules", ListFilter], ["settings", Sliders]] as const).map(([page, Icon]) =>
        <button key={page} disabled={busy} aria-label={pages[page][0]} className={"nav-item" + (activePage === page ? " active" : "")} aria-current={activePage === page ? "page" : undefined} onClick={() => navigate(page)}>
          <Icon size={17} /><span>{pages[page][0]}</span>{page === "rules" && status && <span className="nav-count">{status.custom_blocked_domains.length}</span>}
        </button>)}</nav>
      <div className="sidebar-bottom">
        <div className="youtube-note"><Youtube size={19} /><div><strong>YouTube stays yours</strong><span>No forced Restricted Mode.</span></div></div>
        <button className="nav-item quit-nav" disabled={busy} onClick={() => setQuitOpen(true)}><LogOut size={17} /><span>Quit Aegis Guard</span></button>
        <div className="sidebar-footer"><span className={"status-dot" + (status?.shield_enabled ? " green" : "")} />{status ? status.shield_enabled ? "Protection enabled" : "Protection paused" : "Connecting..."}<span>v1.0</span></div>
      </div>
    </aside>
    <div className="workspace-main">
      <Header status={status} loading={loading || busy} onElevateAdmin={() => run(() => invoke("relaunch_admin"))} onRefresh={refresh} />
      <main className="app-main-content">
        <div className="page-heading"><div><p className="eyebrow">PERSONAL WORKSPACE</p><h1>{pages[activePage][0]}</h1><p>{pages[activePage][1]}</p></div><span className="local-badge"><span className="status-dot green" />Runs locally</span></div>
        {error && <div className="notice error-notice" role="alert"><AlertCircle size={18} /><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button></div>}
        {status?.setup_error && <div className="notice error-notice" role="alert"><AlertCircle size={18} /><span>Some settings could not be applied: {status.setup_error}</span></div>}
        {status?.youtube_policy_restricted === null && <div className="notice warning-notice" role="status"><AlertCircle size={18} /><span>Couldn't inspect the current YouTube browser policy. Run as administrator and refresh to check. Your other protection controls are available.</span></div>}
        {status?.youtube_policy_restricted && <div className="notice warning-notice" role="status"><AlertCircle size={18} /><span>An existing Chrome or Edge policy still restricts YouTube. Older Aegis versions did not record who set it.</span><button className="btn-secondary" disabled={!status.is_admin || busy} onClick={() => setRepairOpen(true)}>Restore YouTube</button></div>}
        {status ? <>
          {activePage === "dashboard" && <ShieldStatus status={status} loading={busy || loading}
            onToggleShield={() => run(() => withPin("change protection", pin => invoke("toggle_shield", { pin: pin ?? null })))}
            onRequestUnlock={() => run(() => withPin("request a pause", pin => invoke("request_unlock", { pin: pin ?? null })))}
            onCancelUnlock={() => run(() => invoke("cancel_unlock"))} />}
          {activePage === "rules" && <CustomRules status={status}
            onAddDomain={domain => protectedAction("add a blocked site", "add_blocked_domain", { domain })}
            onRemoveDomain={domain => protectedAction("remove a blocked site", "remove_blocked_domain", { domain })}
            onAddKeyword={keyword => protectedAction("add a keyword", "add_blocked_keyword", { keyword })}
            onRemoveKeyword={keyword => protectedAction("remove a keyword", "remove_blocked_keyword", { keyword })}
            onSyncBlocklist={async () => { let result!: SyncResult; await mutate(() => withPin("sync the blocklist", async pin => { result = await invoke<SyncResult>("sync_blocklist", { pin: pin ?? null }); })); return result; }} />}
          {activePage === "settings" && <Settings status={status}
            onDirtyChange={setSettingsDirty}
            onUpdateSettings={(settings: UpdateSettingsPayload) => protectedAction("save settings", "update_settings", { settings })}
            onOpenSetPin={setPin} onRemovePin={async () => { removePin(); }}
            onResetStats={() => protectedAction("reset the counter", "reset_stats", {})} />}
        </> : <div className="empty-state"><Shield size={32} /><h2>{error ? "Couldn't connect to protection" : "Loading your workspace"}</h2><p>{error ? "Try refreshing. Make sure Aegis Guard is running." : "Reading your settings and protection status..."}</p><button className="btn-secondary" onClick={refresh}>Retry connection</button></div>}
        <footer className="content-footer"><span>Aegis Guard · Personal protection</span><span>Close the window to keep running in the tray.</span></footer>
      </main>
    </div>
    <PinModal isOpen={pinModal !== null} title={pinModal?.title ?? ""} subtitle={pinModal?.subtitle} isNewPin={pinModal?.isNew}
      onConfirm={pinModal?.confirm ?? (async () => {})} onClose={() => { if (pendingPin.current) cancelPin(); else setPinModal(null); }} />
    {quitOpen && <div className="modal-backdrop"><section ref={popupRef} className="modal-container" role="dialog" aria-modal="true" aria-labelledby="quit-title">
      <div className="modal-header"><h2 id="quit-title">Quit Aegis Guard?</h2><button className="icon-button" aria-label="Cancel quit" onClick={() => setQuitOpen(false)}><X size={18} /></button></div>
      <p className="modal-subtitle">This closes the app and stops window monitoring. DNS, blocked sites, and browser settings remain in place until you pause protection.</p>
      {settingsDirty && <p className="helper-text">Your unsaved settings changes will be discarded.</p>}
      <p className="helper-text">To turn off blocking too, cancel and pause protection from Overview first. Your PIN and unlock delay still apply.</p>
      <div className="modal-actions"><button className="btn-secondary" onClick={() => setQuitOpen(false)}>Keep running</button><button className="btn-primary" autoFocus disabled={busy} onClick={() => run(() => invoke("quit_app"))}>Quit app</button></div>
    </section></div>}
    {pendingPage && <div className="modal-backdrop"><section ref={popupRef} className="modal-container" role="dialog" aria-modal="true" aria-labelledby="discard-title"><h2 id="discard-title">Discard unsaved changes?</h2><p className="modal-subtitle">Your protection settings have not been saved. Stay here to save them, or discard your edits.</p><div className="modal-actions"><button className="btn-secondary" autoFocus onClick={() => setPendingPage(null)}>Keep editing</button><button className="btn-primary" onClick={() => { setSettingsDirty(false); setActivePage(pendingPage); setPendingPage(null); }}>Discard and continue</button></div></section></div>}
    {repairOpen && <div className="modal-backdrop"><section ref={popupRef} className="modal-container" role="dialog" aria-modal="true" aria-labelledby="repair-title"><h2 id="repair-title">Restore YouTube browser settings?</h2><p className="modal-subtitle">This removes the enforced Restricted Mode policy from Chrome and Edge. It also removes old YouTube redirects inside Aegis's own hosts section.</p><p className="helper-text">Use this if Aegis previously restricted YouTube. Policies managed by a workplace or another administrator may be reapplied. Other browser protection settings remain in place.</p><div className="modal-actions"><button className="btn-secondary" autoFocus onClick={() => setRepairOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => { setRepairOpen(false); run(() => withPin("restore YouTube browser settings", pin => invoke("restore_youtube", { pin: pin ?? null }))); }}>Restore YouTube</button></div></section></div>}
  </div>;
}
