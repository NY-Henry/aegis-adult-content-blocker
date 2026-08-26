import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Shield, Sliders, ListFilter } from "lucide-react";
import { Header } from "./components/Header";
import { ShieldStatus } from "./components/ShieldStatus";
import { CustomRules } from "./components/CustomRules";
import { Settings } from "./components/Settings";
import { PinModal } from "./components/PinModal";
import { AppStatusResponse, SyncResult, UpdateSettingsPayload } from "./types";
import "./App.css";

export const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatusResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "rules" | "settings">("dashboard");
  const [loading, setLoading] = useState<boolean>(true);

  // Pin Modal state
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState("Enter Security PIN");
  const [pinModalSubtitle, setPinModalSubtitle] = useState<string | undefined>();
  const [isNewPinModal, setIsNewPinModal] = useState(false);
  const [pinActionCallback, setPinActionCallback] = useState<
    ((pin: string, newPin?: string) => Promise<void>) | null
  >(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await invoke<AppStatusResponse>("get_status");
      setStatus(res);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 1 second when in waiting cooldown, otherwise every 4 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, status?.cooldown_status.status === "waiting" ? 1000 : 4000);

    return () => clearInterval(interval);
  }, [fetchStatus, status?.cooldown_status.status]);

  // Helper to execute actions that may require a PIN
  const executeWithPin = async (
    actionName: string,
    action: (pin?: string) => Promise<void>
  ) => {
    if (status?.has_pin) {
      setPinModalTitle("Authentication Required");
      setPinModalSubtitle(`Please enter your security PIN to ${actionName}.`);
      setIsNewPinModal(false);
      setPinActionCallback(() => async (pin: string) => {
        await action(pin);
        await fetchStatus();
      });
      setPinModalOpen(true);
    } else {
      await action();
      await fetchStatus();
    }
  };

  const handleToggleShield = async () => {
    try {
      if (status?.shield_enabled && status?.has_pin) {
        await executeWithPin("disable protection", async (pin) => {
          const res = await invoke<AppStatusResponse>("toggle_shield", { pin: pin || null });
          setStatus(res);
        });
      } else {
        const res = await invoke<AppStatusResponse>("toggle_shield", { pin: null });
        setStatus(res);
      }
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Failed to toggle shield");
    }
  };

  const handleRequestUnlock = async () => {
    try {
      if (status?.has_pin) {
        await executeWithPin("request unlock cooldown", async (pin) => {
          await invoke("request_unlock", { pin: pin || null });
        });
      } else {
        await invoke("request_unlock", { pin: null });
        await fetchStatus();
      }
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Unlock request failed");
    }
  };

  const handleCancelUnlock = async () => {
    try {
      await invoke("cancel_unlock");
      await fetchStatus();
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Cancel failed");
    }
  };

  const handleElevateAdmin = async () => {
    try {
      await invoke("relaunch_admin");
    } catch (err: any) {
      alert(typeof err === "string" ? err : err?.message || "Elevation failed");
    }
  };

  const handleAddDomain = async (domain: string) => {
    await executeWithPin("add custom blocked domain", async (pin) => {
      await invoke("add_blocked_domain", { domain, pin: pin || null });
    });
  };

  const handleRemoveDomain = async (domain: string) => {
    await executeWithPin("remove blocked domain", async (pin) => {
      await invoke("remove_blocked_domain", { domain, pin: pin || null });
    });
  };

  const handleAddKeyword = async (keyword: string) => {
    await executeWithPin("add trigger keyword", async (pin) => {
      await invoke("add_blocked_keyword", { keyword, pin: pin || null });
    });
  };

  const handleRemoveKeyword = async (keyword: string) => {
    await executeWithPin("remove trigger keyword", async (pin) => {
      await invoke("remove_blocked_keyword", { keyword, pin: pin || null });
    });
  };

  const handleSyncBlocklist = async (): Promise<SyncResult> => {
    return await invoke<SyncResult>("sync_blocklist");
  };

  const handleUpdateSettings = async (payload: UpdateSettingsPayload) => {
    await executeWithPin("modify protection settings", async (pin) => {
      const res = await invoke<AppStatusResponse>("update_settings", {
        settings: payload,
        pin: pin || null,
      });
      setStatus(res);
    });
  };

  const handleOpenSetPin = () => {
    setPinModalTitle(status?.has_pin ? "Change Master PIN" : "Set Master Security PIN");
    setPinModalSubtitle("Create a 4+ digit PIN to protect your settings and lock anti-relapse timers.");
    setIsNewPinModal(true);
    setPinActionCallback(() => async (currentPin: string, newPin?: string) => {
      if (newPin) {
        await invoke("set_pin", {
          currentPin: currentPin || null,
          newPin,
        });
        await fetchStatus();
      }
    });
    setPinModalOpen(true);
  };

  const handleRemovePin = async () => {
    setPinModalTitle("Remove PIN Protection");
    setPinModalSubtitle("Enter your current PIN to remove PIN security lock.");
    setIsNewPinModal(false);
    setPinActionCallback(() => async (currentPin: string) => {
      await invoke("remove_pin", { currentPin });
      await fetchStatus();
    });
    setPinModalOpen(true);
  };

  const handleResetStats = async () => {
    await executeWithPin("reset block statistics", async (pin) => {
      await invoke("reset_stats", { pin: pin || null });
    });
  };

  return (
    <div className="app-layout">
      <Header
        status={status}
        onElevateAdmin={handleElevateAdmin}
        onRefresh={fetchStatus}
        loading={loading}
      />

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <Shield size={17} />
          <span>Protection Shield</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveTab("rules")}
        >
          <ListFilter size={17} />
          <span>Rules & Blocklists</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Sliders size={17} />
          <span>Settings & DNS</span>
        </button>
      </nav>

      <main className="app-main-content">
        {status ? (
          <>
            {activeTab === "dashboard" && (
              <ShieldStatus
                status={status}
                onToggleShield={handleToggleShield}
                onRequestUnlock={handleRequestUnlock}
                onCancelUnlock={handleCancelUnlock}
                loading={loading}
              />
            )}

            {activeTab === "rules" && (
              <CustomRules
                status={status}
                onAddDomain={handleAddDomain}
                onRemoveDomain={handleRemoveDomain}
                onAddKeyword={handleAddKeyword}
                onRemoveKeyword={handleRemoveKeyword}
                onSyncBlocklist={handleSyncBlocklist}
              />
            )}

            {activeTab === "settings" && (
              <Settings
                status={status}
                onUpdateSettings={handleUpdateSettings}
                onOpenSetPin={handleOpenSetPin}
                onRemovePin={handleRemovePin}
                onResetStats={handleResetStats}
              />
            )}
          </>
        ) : (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Initializing Aegis Protection Engine...</p>
          </div>
        )}
      </main>

      <PinModal
        isOpen={pinModalOpen}
        title={pinModalTitle}
        subtitle={pinModalSubtitle}
        isNewPin={isNewPinModal}
        onConfirm={pinActionCallback || (async () => {})}
        onClose={() => setPinModalOpen(false)}
      />
    </div>
  );
};

export default App;
