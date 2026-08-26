import React, { useState } from "react";
import {
  Plus,
  Trash2,
  DownloadCloud,
  Globe,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { AppStatusResponse, SyncResult } from "../types";

interface CustomRulesProps {
  status: AppStatusResponse;
  onAddDomain: (domain: string) => Promise<void>;
  onRemoveDomain: (domain: string) => Promise<void>;
  onAddKeyword: (keyword: string) => Promise<void>;
  onRemoveKeyword: (keyword: string) => Promise<void>;
  onSyncBlocklist: () => Promise<SyncResult>;
}

export const CustomRules: React.FC<CustomRulesProps> = ({
  status,
  onAddDomain,
  onRemoveDomain,
  onAddKeyword,
  onRemoveKeyword,
  onSyncBlocklist,
}) => {
  const [newDomain, setNewDomain] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const handleAddDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    try {
      await onAddDomain(newDomain.trim());
      setNewDomain("");
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Failed to add domain");
    }
  };

  const handleAddKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    try {
      await onAddKeyword(newKeyword.trim());
      setNewKeyword("");
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Failed to add keyword");
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncMsg(null);
      const res = await onSyncBlocklist();
      setSyncMsg(`Successfully synchronized and sinkholed ${res.total_domains.toLocaleString()} domains!`);
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (ts: number | null) => {
    if (!ts) return "Never synced";
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="custom-rules-container">
      {/* 100k+ Blocklist Sync Card */}
      <div className="sync-card">
        <div className="sync-card-info">
          <div className="sync-icon-box">
            <DownloadCloud size={24} />
          </div>
          <div>
            <h4>Massive Adult Domain Blocklist Sync</h4>
            <p>
              Download and compile curated community blocklists (StevenBlack Porn & Unified) containing over 100,000+ verified explicit domains.
            </p>
            <span className="sync-meta">Last Updated: {formatDate(status.last_sync_timestamp)}</span>
          </div>
        </div>
        <div className="sync-card-action">
          <button
            className={`btn-sync ${syncing ? "loading" : ""}`}
            onClick={handleSync}
            disabled={syncing}
          >
            <DownloadCloud size={16} />
            <span>{syncing ? "Downloading Blocklist..." : "Sync 100k+ Blocklist"}</span>
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="success-toast">
          <CheckCircle2 size={18} />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Grid of Domain & Keyword managers */}
      <div className="rules-grid">
        {/* Domain Blocklist */}
        <div className="rules-panel">
          <div className="rules-panel-header">
            <div className="panel-title-row">
              <Globe size={18} />
              <h4>Custom Blocked Domains ({status.custom_blocked_domains.length})</h4>
            </div>
            <p className="panel-subtitle">Any domain added here is sinkholed directly in the Windows hosts file.</p>
          </div>

          <form onSubmit={handleAddDomainSubmit} className="add-rule-form">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. badsite.com"
              className="text-input rule-input"
            />
            <button type="submit" className="btn-add-rule">
              <Plus size={16} />
              <span>Add</span>
            </button>
          </form>

          <div className="rules-chip-list">
            {status.custom_blocked_domains.map((domain) => (
              <div key={domain} className="rule-chip">
                <span>{domain}</span>
                <button
                  className="btn-remove-chip"
                  onClick={() => onRemoveDomain(domain)}
                  title="Remove domain"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {status.custom_blocked_domains.length === 0 && (
              <p className="empty-rules-hint">No custom domains added yet.</p>
            )}
          </div>
        </div>

        {/* Watchdog Trigger Keywords */}
        <div className="rules-panel">
          <div className="rules-panel-header">
            <div className="panel-title-row">
              <Tag size={18} />
              <h4>Trigger Watchdog Keywords ({status.blocked_keywords.length})</h4>
            </div>
            <p className="panel-subtitle">Foreground windows containing these terms will be closed immediately.</p>
          </div>

          <form onSubmit={handleAddKeywordSubmit} className="add-rule-form">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. search keyword"
              className="text-input rule-input"
            />
            <button type="submit" className="btn-add-rule">
              <Plus size={16} />
              <span>Add</span>
            </button>
          </form>

          <div className="rules-chip-list">
            {status.blocked_keywords.map((kw) => (
              <div key={kw} className="rule-chip keyword-chip">
                <span>{kw}</span>
                <button
                  className="btn-remove-chip"
                  onClick={() => onRemoveKeyword(kw)}
                  title="Remove keyword"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {status.blocked_keywords.length === 0 && (
              <p className="empty-rules-hint">No trigger keywords added.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
