import { useEffect, useState, useCallback, useRef } from "react";
import { Account, UsageWindow } from "./types";
import { api } from "./core/api";
import { Header } from "./ui/components/Header";
import { Dashboard } from "./ui/components/Dashboard";
import { AddAccountModal } from "./ui/components/AddAccountModal";
import { AccountDetailModal } from "./ui/components/AccountDetailModal";
import { SettingsModal } from "./ui/components/SettingsModal";
import "./App.css";

export function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, UsageWindow[]>>({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const refreshIntervalRef = useRef<number | null>(null);

  // Load accounts and their latest usage from SQLite
  const loadAccountsAndUsage = useCallback(async () => {
    try {
      let list = await api.listAccounts();

      // Auto-seed initial default accounts if database is empty
      if (list.length === 0) {
        const providers = await api.detectProviders();
        const agyMeta = providers.find((p) => p.provider === "antigravity");
        const codexMeta = providers.find((p) => p.provider === "codex");

        const seeded: Account[] = [];
        const now = new Date().toISOString();

        if (agyMeta?.installed) {
          const newAgy: Account = {
            id: `antigravity-default`,
            provider: "antigravity",
            displayName: "Antigravity Active",
            authProfileId: "default",
            enabled: true,
            createdAt: now,
            updatedAt: now,
          };
          await api.saveAccount(newAgy);
          seeded.push(newAgy);
        }

        if (codexMeta?.installed) {
          const newCodex: Account = {
            id: `codex-default`,
            provider: "codex",
            displayName: "Codex Default",
            authProfileId: "~/.codex",
            enabled: true,
            createdAt: now,
            updatedAt: now,
          };
          await api.saveAccount(newCodex);
          seeded.push(newCodex);
        }

        if (seeded.length > 0) {
          list = seeded;
        }
      }

      setAccounts(list);

      // Load latest usage for each account
      const map: Record<string, UsageWindow[]> = {};
      await Promise.all(
        list.map(async (acc) => {
          try {
            const windows = await api.getLatestUsage(acc.id);
            map[acc.id] = windows;
          } catch {
            map[acc.id] = [];
          }
        })
      );
      setUsageMap(map);

      // If any account has no usage windows yet, trigger an initial refresh
      const needsInitialFetch = list.filter((a) => !map[a.id] || map[a.id].length === 0);
      if (needsInitialFetch.length > 0) {
        for (const acc of needsInitialFetch) {
          try {
            const fresh = await api.refreshAccount(acc.id);
            map[acc.id] = fresh;
          } catch {
            // Error captured in state
          }
        }
        setUsageMap({ ...map });
        // Reload accounts to get updated metadata
        const updated = await api.listAccounts();
        setAccounts(updated);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  }, []);

  // Refresh single account
  const handleRefreshAccount = async (accountId: string) => {
    try {
      const freshWindows = await api.refreshAccount(accountId);
      setUsageMap((prev) => ({
        ...prev,
        [accountId]: freshWindows,
      }));
      // Update account list to reflect updated lastCheckedAt
      const updatedList = await api.listAccounts();
      setAccounts(updatedList);
    } catch (err) {
      console.error("Refresh failed for account:", accountId, err);
    }
  };

  // Refresh all accounts
  const handleRefreshAll = useCallback(async () => {
    try {
      setIsRefreshingAll(true);
      await api.refreshAllAccounts();
      await loadAccountsAndUsage();
    } finally {
      setIsRefreshingAll(false);
    }
  }, [loadAccountsAndUsage]);

  // Delete / disconnect account
  const handleDeleteAccount = async (accountId: string) => {
    await api.deleteAccount(accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setUsageMap((prev) => {
      const next = { ...prev };
      delete next[accountId];
      return next;
    });
  };

  // Setup auto-refresh scheduler (Phase 4 requirement: 60s foreground, 300s background)
  useEffect(() => {
    const setupScheduler = async () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      const fgStr = (await api.getSetting("refresh_fg_seconds")) || "60";
      const bgStr = (await api.getSetting("refresh_bg_seconds")) || "300";

      const fgMs = Math.max(15, parseInt(fgStr, 10) || 60) * 1000;
      const bgMs = Math.max(60, parseInt(bgStr, 10) || 300) * 1000;

      const schedule = () => {
        const isVisible = !document.hidden;
        api.setWindowVisible(isVisible);
        const intervalMs = isVisible ? fgMs : bgMs;
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        refreshIntervalRef.current = window.setInterval(() => {
          handleRefreshAll();
        }, intervalMs);
      };

      schedule();
      document.addEventListener("visibilitychange", schedule);

      return () => {
        document.removeEventListener("visibilitychange", schedule);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    };

    setupScheduler();
  }, [handleRefreshAll]);

  // Initial mount load
  useEffect(() => {
    loadAccountsAndUsage();
  }, [loadAccountsAndUsage]);

  // Calculate earliest reset banner for Header
  let nextResetBanner: string | undefined;
  let minResetTime = Infinity;
  for (const acc of accounts) {
    const windows = usageMap[acc.id] || [];
    for (const w of windows) {
      if (w.resetAt) {
        const ts = new Date(w.resetAt).getTime();
        if (!isNaN(ts) && ts > Date.now() && ts < minResetTime) {
          minResetTime = ts;
          const diffMin = Math.round((ts - Date.now()) / 60000);
          if (diffMin < 60) {
            nextResetBanner = `in ${diffMin}m (${acc.displayName || acc.provider})`;
          } else {
            const hrs = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            nextResetBanner = `in ${hrs}h ${mins}m (${acc.displayName || acc.provider})`;
          }
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#080c12] text-stone-200 flex flex-col selection:bg-blue-400 selection:text-white">
      <Header
        accountCount={accounts.length}
        isRefreshing={isRefreshingAll}
        onRefreshAll={handleRefreshAll}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        nextResetText={nextResetBanner}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        <Dashboard
          accounts={accounts}
          usageMap={usageMap}
          onRefreshAccount={handleRefreshAccount}
          onSelectAccount={(acc) => setSelectedAccount(acc)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      </main>

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={() => {
          loadAccountsAndUsage();
        }}
      />

      {/* Account Detail Modal */}
      <AccountDetailModal
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onRefresh={handleRefreshAccount}
        onDelete={handleDeleteAccount}
      />

      {/* Settings & Health Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
