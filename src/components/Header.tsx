import React from "react";
import { ShieldCheck, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import { AppStatusResponse } from "../types";

interface HeaderProps {
  status: AppStatusResponse | null;
  onElevateAdmin: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onElevateAdmin,
  onRefresh,
  loading,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className={`brand-icon-wrapper ${status?.shield_enabled ? "active" : "inactive"}`}>
          {status?.shield_enabled ? (
            <ShieldCheck className="brand-icon pulse" size={28} />
          ) : (
            <ShieldAlert className="brand-icon" size={28} />
          )}
        </div>
        <div className="brand-titles">
          <div className="brand-title-row">
            <h1>AEGIS GUARD</h1>
            <span className={`status-pill ${status?.shield_enabled ? "active" : "inactive"}`}>
              {status?.shield_enabled ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
          <p className="brand-subtitle">System-Wide Protection & Focus Engine</p>
        </div>
      </div>

      <div className="header-actions">
        {status && !status.is_admin && (
          <button
            className="btn-elevate"
            onClick={onElevateAdmin}
            title="Grant Administrator Privileges to enable system-wide Hosts and DNS locks"
          >
            <Zap size={15} />
            <span>Elevate to Admin</span>
          </button>
        )}

        {status?.is_admin && (
          <div className="admin-badge" title="Running with Administrator Privileges">
            <span className="admin-dot"></span>
            <span>Admin Active</span>
          </div>
        )}

        <button
          className={`btn-refresh ${loading ? "spinning" : ""}`}
          onClick={onRefresh}
          title="Refresh Status"
        >
          <RefreshCw size={17} />
        </button>
      </div>
    </header>
  );
};
