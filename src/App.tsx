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
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );

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

  // Theme toggle
  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tokenly-theme", next);
    } catch {}
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--t-bg)] text-[var(--t-ink-2)]">
      <Header
        accountCount={accounts.length}
        isRefreshing={isRefreshingAll}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onRefreshAll={handleRefreshAll}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
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
