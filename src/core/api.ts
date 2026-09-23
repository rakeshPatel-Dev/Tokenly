import { invoke } from "@tauri-apps/api/core";
import { Account, UsageWindow, ProviderMetadata } from "../types";

export const isTauri = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
};

// Raw records from Rust SQLite
interface RawAccountRecord {
  id: string;
  provider: string;
  provider_account_id?: string;
  email?: string;
  display_name?: string;
  plan?: string;
  auth_profile_id: string;
  enabled: boolean;
  last_checked_at?: string;
  created_at: string;
  updated_at: string;
}

interface RawUsageWindowRecord {
  id: string;
  account_id: string;
  name: string;
  window_type: string;
  used_percent?: number;
  remaining_percent?: number;
  used?: number;
  limit?: number;
  reset_at?: string;
  source: string;
  fetched_at: string;
}

function mapAccount(raw: RawAccountRecord): Account {
  return {
    id: raw.id,
    provider: raw.provider as Account["provider"],
    providerAccountId: raw.provider_account_id,
    email: raw.email,
    displayName: raw.display_name,
    plan: raw.plan,
    authProfileId: raw.auth_profile_id,
    enabled: raw.enabled,
    lastCheckedAt: raw.last_checked_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapUsageWindow(raw: RawUsageWindowRecord): UsageWindow {
  return {
    id: raw.id,
    accountId: raw.account_id,
    name: raw.name,
    windowType: raw.window_type as UsageWindow["windowType"],
    usedPercent: raw.used_percent,
    remainingPercent: raw.remaining_percent,
    used: raw.used,
    limit: raw.limit,
    resetAt: raw.reset_at,
    source: raw.source as UsageWindow["source"],
    fetchedAt: raw.fetched_at,
  };
}

// In-memory fallback store for browser development preview
let browserAccounts: Account[] = [
  {
    id: "antigravity-active",
    provider: "antigravity",
    displayName: "Antigravity Work",
    email: "work@google.com",
    plan: "Pro",
    authProfileId: "default",
    enabled: true,
    lastCheckedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "codex-personal",
    provider: "codex",
    displayName: "Codex Personal",
    email: "personal@gmail.com",
    plan: "Plus",
    authProfileId: "~/.codex",
    enabled: true,
    lastCheckedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let browserUsageMap: Record<string, UsageWindow[]> = {
  "antigravity-active": [
    {
      id: "agy-gemini",
      accountId: "antigravity-active",
      name: "Gemini Models (Weekly Limit)",
      windowType: "weekly",
      remainingPercent: 85.3,
      usedPercent: 14.7,
      resetAt: new Date(Date.now() + 6 * 86400000 + 21 * 3600000).toISOString(),
      source: "official_cli",
      fetchedAt: new Date().toISOString(),
    },
    {
      id: "agy-3p",
      accountId: "antigravity-active",
      name: "Claude & GPT (Weekly Limit)",
      windowType: "weekly",
      remainingPercent: 86.7,
      usedPercent: 13.3,
      resetAt: new Date(Date.now() + 6 * 86400000 + 23 * 3600000).toISOString(),
      source: "official_cli",
      fetchedAt: new Date().toISOString(),
    },
  ],
  "codex-personal": [
    {
      id: "codex-5h",
      accountId: "codex-personal",
      name: "5-hour window",
      windowType: "session",
      remainingPercent: 82.0,
      usedPercent: 18.0,
      resetAt: new Date(Date.now() + 102 * 60000).toISOString(),
      source: "official_app_server",
      fetchedAt: new Date().toISOString(),
    },
    {
      id: "codex-weekly",
      accountId: "codex-personal",
      name: "Weekly window",
      windowType: "weekly",
      remainingPercent: 71.0,
      usedPercent: 29.0,
      resetAt: new Date(Date.now() + 3.5 * 86400000).toISOString(),
      source: "official_app_server",
      fetchedAt: new Date().toISOString(),
    },
  ],
};

export const api = {
  async listAccounts(): Promise<Account[]> {
    if (!isTauri()) {
      return browserAccounts;
    }
    const raw = await invoke<RawAccountRecord[]>("list_accounts");
    return raw.map(mapAccount);
  },

  async saveAccount(account: Account): Promise<void> {
    if (!isTauri()) {
      const idx = browserAccounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) browserAccounts[idx] = account;
      else browserAccounts.push(account);
      return;
    }
    const raw: RawAccountRecord = {
      id: account.id,
      provider: account.provider,
      provider_account_id: account.providerAccountId,
      email: account.email,
      display_name: account.displayName,
      plan: account.plan,
      auth_profile_id: account.authProfileId,
      enabled: account.enabled,
      last_checked_at: account.lastCheckedAt,
      created_at: account.createdAt,
      updated_at: account.updatedAt,
    };
    await invoke("save_account", { account: raw });
  },

  async deleteAccount(id: string): Promise<void> {
    if (!isTauri()) {
      browserAccounts = browserAccounts.filter((a) => a.id !== id);
      delete browserUsageMap[id];
      return;
    }
    await invoke("delete_account", { id });
  },

  async getLatestUsage(accountId: string): Promise<UsageWindow[]> {
    if (!isTauri()) {
      return browserUsageMap[accountId] || [];
    }
    const raw = await invoke<RawUsageWindowRecord[]>("get_latest_usage", {
      accountId,
    });
    return raw.map(mapUsageWindow);
  },

  async getUsageHistory(accountId: string, limit = 20): Promise<UsageWindow[]> {
    if (!isTauri()) {
      return browserUsageMap[accountId] || [];
    }
    const raw = await invoke<RawUsageWindowRecord[]>("get_usage_history", {
      accountId,
      limit,
    });
    return raw.map(mapUsageWindow);
  },

  async detectProviders(): Promise<ProviderMetadata[]> {
    if (!isTauri()) {
      return [
        {
          provider: "antigravity",
          installed: true,
          version: "1.2.9",
          status: "detected",
          updatedAt: new Date().toISOString(),
        },
        {
          provider: "codex",
          installed: true,
          version: "0.155.1",
          status: "detected",
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    return await invoke<ProviderMetadata[]>("detect_providers");
  },

  async queryCodex(codexHome?: string) {
    if (!isTauri()) {
      return {
        success: true,
        authenticated: true,
        windows: browserUsageMap["codex-personal"],
        plan_type: "plus",
        email: "personal@gmail.com",
      };
    }
    return await invoke<any>("query_codex", { codexHome });
  },

  async queryAntigravity(agyHome?: string) {
    if (!isTauri()) {
      return {
        success: true,
        authenticated: true,
        windows: browserUsageMap["antigravity-active"],
        email: "work@google.com",
      };
    }
    return await invoke<any>("query_antigravity", { agyHome });
  },

  async refreshAccount(accountId: string): Promise<UsageWindow[]> {
    if (!isTauri()) {
      return browserUsageMap[accountId] || [];
    }
    const raw = await invoke<RawUsageWindowRecord[]>("refresh_account", {
      accountId,
    });
    return raw.map(mapUsageWindow);
  },

  async refreshAllAccounts(): Promise<void> {
    if (!isTauri()) return;
    await invoke("refresh_all_accounts");
  },

  async getSetting(key: string): Promise<string | null> {
    if (!isTauri()) {
      return localStorage.getItem(`tokenly_${key}`);
    }
    return await invoke<string | null>("get_setting", { key });
  },

  async setSetting(key: string, value: string): Promise<void> {
    if (!isTauri()) {
      localStorage.setItem(`tokenly_${key}`, value);
      return;
    }
    await invoke("set_setting", { key, value });
  },

  async setWindowVisible(visible: boolean): Promise<void> {
    if (!isTauri()) return;
    await invoke("set_window_visible", { visible });
  },

  async setRefreshIntervals(fgSecs: number, bgSecs: number): Promise<void> {
    if (!isTauri()) return;
    await invoke("set_refresh_intervals", { fgSecs, bgSecs });
  },
};
