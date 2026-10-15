import { useState } from "react";
import { DownloadCloud, Globe, Plus, Tag, Trash2 } from "lucide-react";
import { AppStatusResponse, SyncResult } from "../types";
import { errorMessage } from "../utils";
interface Props {
  status: AppStatusResponse; onAddDomain: (domain: string) => Promise<void>; onRemoveDomain: (domain: string) => Promise<void>;
  onAddKeyword: (keyword: string) => Promise<void>; onRemoveKeyword: (keyword: string) => Promise<void>; onSyncBlocklist: () => Promise<SyncResult>;
}
export function CustomRules({ status, onAddDomain, onRemoveDomain, onAddKeyword, onRemoveKeyword, onSyncBlocklist }: Props) {
  const [domain, setDomain] = useState(""); const [keyword, setKeyword] = useState(""); const [filter, setFilter] = useState("");
  const [pending, setPending] = useState<string | null>(null); const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const perform = async (key: string, action: () => Promise<void>) => {
    setPending(key); setNotice(null);
    try { await action(); }
    catch (error) { if (errorMessage(error) !== "Action cancelled.") setNotice({ text: errorMessage(error), error: true }); }
    finally { setPending(null); }
  };
  const date = status.last_sync_timestamp ? new Date(status.last_sync_timestamp * 1000).toLocaleString() : "Not synced yet";
  return <div className="custom-rules-container">
    <section className="sync-card"><div className="sync-card-info"><DownloadCloud size={21} /><div><h2>Community blocklist</h2><p>Add up to 15,000 community domain rules. YouTube and its media domains are excluded.</p><span className="sync-meta">Last sync: {date}</span></div></div><button className="btn-secondary" disabled={pending !== null || !status.is_admin || !status.shield_enabled || !status.hosts_blocking_enabled} onClick={() => { void perform("sync", async () => { const result = await onSyncBlocklist(); setNotice({ text: result.total_domains.toLocaleString() + " domain rules applied.", error: false }); }); }}><DownloadCloud size={14} />{pending === "sync" ? "Syncing..." : "Sync blocklist"}</button></section>
    {(!status.is_admin || !status.shield_enabled || !status.hosts_blocking_enabled) && <p className="helper-text">Sync requires administrator access, enabled protection, and the blocked-sites layer.</p>}
    {notice && <div className={"notice " + (notice.error ? "error-notice" : "success-notice")} role={notice.error ? "alert" : "status"}><span>{notice.text}</span></div>}
    <div className="rules-grid">
      <section className="panel"><div className="panel-heading"><div><h2><Globe size={15} /> Blocked sites</h2><p>Add a domain or paste a website URL.</p></div><span className="badge neutral">{status.custom_blocked_domains.length}</span></div><div className="rules-body">
        <form className="add-rule-form" onSubmit={event => { event.preventDefault(); if (domain.trim()) void perform("domain", async () => { await onAddDomain(domain.trim()); setDomain(""); }); }}><input className="text-input" aria-label="Website to block" value={domain} onChange={event => setDomain(event.target.value)} placeholder="example.com" disabled={pending !== null} /><button className="btn-secondary" type="submit" disabled={!domain.trim() || pending !== null}><Plus size={14} />Add</button></form>
        <div className="rules-filter"><input className="text-input" type="search" aria-label="Search blocked sites" placeholder="Search blocked sites..." value={filter} onChange={event => setFilter(event.target.value)} /></div>
        <div className="rule-list">{status.custom_blocked_domains.filter(item => item.includes(filter.toLowerCase())).map(item => <div className="rule-row" key={item}><span>{item}</span><button className="icon-button" aria-label={"Remove " + item} disabled={pending !== null} onClick={() => { void perform(item, () => onRemoveDomain(item)); }}><Trash2 size={14} /></button></div>)}
          {status.custom_blocked_domains.filter(item => item.includes(filter.toLowerCase())).length === 0 && <p className="empty-rules-hint">{filter ? "No matching sites." : "No custom sites yet. Add one above."}</p>}</div>
      </div></section>
      <section className="panel"><div className="panel-heading"><div><h2><Tag size={15} /> Window keywords</h2><p>{status.watchdog_enabled ? "Window monitoring is enabled." : "Window monitoring is off. Enable it in Settings."}</p></div><span className="badge neutral">{status.blocked_keywords.length}</span></div><div className="rules-body">
        <form className="add-rule-form" onSubmit={event => { event.preventDefault(); if (keyword.trim()) void perform("keyword", async () => { await onAddKeyword(keyword.trim()); setKeyword(""); }); }}><input className="text-input" aria-label="Window keyword to block" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="A word or phrase" disabled={pending !== null} /><button className="btn-secondary" type="submit" disabled={!keyword.trim() || pending !== null}><Plus size={14} />Add</button></form>
        <p className="helper-text">Matching window titles can close the entire browser window. Identifiable YouTube windows are excluded.</p>
        <div className="rule-list">{status.blocked_keywords.map(item => <div className="rule-row" key={item}><span>{item}</span><button className="icon-button" aria-label={"Remove keyword " + item} disabled={pending !== null} onClick={() => { void perform(item, () => onRemoveKeyword(item)); }}><Trash2 size={14} /></button></div>)}
          {status.blocked_keywords.length === 0 && <p className="empty-rules-hint">No keywords yet.</p>}</div>
      </div></section>
    </div>
  </div>;
}
