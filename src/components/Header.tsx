import { ChevronRight, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { AppStatusResponse } from "../types";
interface Props { status: AppStatusResponse | null; onElevateAdmin: () => void; onRefresh: () => void; loading: boolean; }
export function Header({ status, onElevateAdmin, onRefresh, loading }: Props) {
  return <header className="app-header"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Personal</strong></div><div className="header-actions">
    {status && (status.is_admin ? <span className="admin-badge"><ShieldCheck size={14} />Administrator</span> : <button className="btn-secondary btn-elevate" onClick={onElevateAdmin}><Zap size={14} />Run as administrator</button>)}
    <button className={"icon-button" + (loading ? " spinning" : "")} onClick={onRefresh} disabled={loading} aria-label="Refresh protection status" title="Refresh status"><RefreshCw size={16} /></button>
  </div></header>;
}
