import React from "react";
import { Moon, Plus, RefreshCw, Settings, Sun } from "lucide-react";

interface Props {
  accountCount: number;
  isRefreshing: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onRefreshAll: () => Promise<void>;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<Props> = ({
  accountCount,
  isRefreshing,
  theme,
  onToggleTheme,
  onRefreshAll,
  onOpenAddModal,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--t-line)] bg-[var(--t-bg)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/tokenly.svg" alt="Tokenly" className="h-7 w-7" />
          <span className="text-[13px] font-semibold text-[var(--t-ink)]">Tokenly</span>
          <span className="border-l border-[var(--t-line)] pl-3 text-[12px] text-[var(--t-ink-6)]">
            {accountCount} {accountCount === 1 ? "account" : "accounts"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="btn btn-amber"
            title="Check all credits again"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="btn btn-ghost btn-icon"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="btn btn-ghost btn-icon"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          <button onClick={onOpenAddModal} className="btn btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Add account
          </button>
        </div>
      </div>
    </header>
  );
};