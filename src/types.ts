export type DnsProvider = "cloudflare" | "clean_browsing" | "ad_guard";

export type CooldownStatus =
  | { status: "no_cooldown_required" }
  | { status: "unlocked" }
  | { status: "waiting"; seconds_remaining: number; total_seconds: number }
  | { status: "expired" };

export interface AppStatusResponse {
  shield_enabled: boolean;
  is_admin: boolean;
  dns_blocking_enabled: boolean;
  dns_provider: DnsProvider;
  hosts_blocking_enabled: boolean;
  browser_policies_enabled: boolean;
  watchdog_enabled: boolean;
  custom_blocked_domains: string[];
  blocked_keywords: string[];
  has_pin: boolean;
  unlock_delay_minutes: number;
  cooldown_status: CooldownStatus;
  total_blocked_attempts: number;
  last_sync_timestamp: number | null;
  active_blocklist_count: number;
}

export interface UpdateSettingsPayload {
  dns_blocking_enabled: boolean;
  dns_provider: DnsProvider;
  hosts_blocking_enabled: boolean;
  browser_policies_enabled: boolean;
  watchdog_enabled: boolean;
  unlock_delay_minutes: number;
}

export interface SyncResult {
  total_domains: number;
  timestamp: number;
}
