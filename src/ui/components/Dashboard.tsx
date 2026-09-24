import React, { useState } from "react";
import { Account, UsageWindow } from "../../types";
import { AccountCard } from "./AccountCard";
import { Plus, Search } from "lucide-react";

interface Props {
  accounts: Account[];
  usageMap: Record<string, UsageWindow[]>;
  onRefreshAccount: (accountId: string) => Promise<void>;
  onSelectAccount: (account: Account) => void;
  onOpenAddModal: () => void;
}

function timeUntil(iso: string | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d}d`;
}

function quotaTone(pct: number): string {
  if (pct < 20) return "text-[var(--t-red)]";
  if (pct < 50) return "text-[var(--t-amber)]";
  return "text-[var(--t-green)]";
}

function resetTone(iso: string | undefined): string {
  if (!iso) return "";
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 86400000 ? "text-[var(--t-amber)]" : "text-[var(--t-ink-2)]";
}

export const Dashboard: React.FC<Props> = ({
  accounts,
  usageMap,
  onRefreshAccount,
  onSelectAccount,
  onOpenAddModal,
}) => {
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  let bestAccount: { account: Account; remainingPercent: number } | null = null;
  let nextResetAccount: { account: Account; resetAt: string } | null = null;
  let earliestResetTime = Infinity;

  for (const acc of accounts) {
    const windows = usageMap[acc.id] || [];
    for (const w of windows) {
      if (w.remainingPercent !== undefined && (!bestAccount || w.remainingPercent > bestAccount.remainingPercent)) {
        bestAccount = { account: acc, remainingPercent: w.remainingPercent };
      }
      if (w.resetAt) {
        const time = new Date(w.resetAt).getTime();
        if (!Number.isNaN(time) && time > Date.now() && time < earliestResetTime) {
          earliestResetTime = time;
          nextResetAccount = { account: acc, resetAt: w.resetAt };
        }
      }
    }
  }

  const filteredAccounts = accounts.filter((acc) => {
    if (filterProvider !== "all" && acc.provider !== filterProvider) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (acc.displayName || "").toLowerCase().includes(q);
      const email = (acc.email || "").toLowerCase().includes(q);
      const profile = (acc.authProfileId || "").toLowerCase().includes(q);
      if (!name && !email && !profile) return false;
    }
    return true;
  });

  const codexAccounts = filteredAccounts.filter((a) => a.provider === "codex");
  const agyAccounts = filteredAccounts.filter((a) => a.provider === "antigravity");

  return (
    <div className="space-y-6">
      {accounts.length > 0 && (
        <div className="summary">
          <div className="summary-cell">
            <span className="summary-label">Most capacity</span>
            {bestAccount ? (
              <span className="summary-value">
                {bestAccount.account.displayName || bestAccount.account.provider}
                {" "}· <span className={`num font-medium ${quotaTone(bestAccount.remainingPercent)}`}>
                  {bestAccount.remainingPercent.toFixed(0)}%
                </span>{" "}
                left
              </span>
            ) : (
              <span className="summary-value text-[var(--t-ink-8)]">No data yet</span>
            )}
          </div>
          <div className="summary-cell">
            <span className="summary-label">Next reset</span>
            {nextResetAccount ? (
              <span className="summary-value">
                {nextResetAccount.account.displayName || nextResetAccount.account.provider}
                {" "}· <span className={resetTone(nextResetAccount.resetAt)}>
                  {timeUntil(nextResetAccount.resetAt)}
                </span>
              </span>
            ) : (
              <span className="summary-value text-[var(--t-ink-8)]">None scheduled</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="seg">
          <button
            className={filterProvider === "all" ? "active" : ""}
            onClick={() => setFilterProvider("all")}
          >
            All ({accounts.length})
          </button>
          <button
            className={filterProvider === "codex" ? "active" : ""}
            onClick={() => setFilterProvider("codex")}
          >
            Codex ({accounts.filter((a) => a.provider === "codex").length})
          </button>
          <button
            className={filterProvider === "antigravity" ? "active" : ""}
            onClick={() => setFilterProvider("antigravity")}
          >
            Antigravity ({accounts.filter((a) => a.provider === "antigravity").length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--t-ink-8)]" />
          <input
            type="text"
            placeholder="Find an account"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input py-1.5 pl-8 pr-3 text-[12px]"
          />
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="panel px-6 py-14 text-center">
          <h3 className="text-[14px] font-semibold text-[var(--t-ink)]">
            {accounts.length === 0 ? "No accounts yet" : "Nothing to show"}
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] text-[var(--t-ink-5)]">
            {accounts.length === 0
              ? "Link a Codex or Antigravity profile to track its credits."
              : "No accounts match this filter."}
          </p>
          {accounts.length === 0 && (
            <button onClick={onOpenAddModal} className="btn btn-primary mt-4">
              <Plus className="h-3.5 w-3.5" />
              Add account
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {(filterProvider === "all" || filterProvider === "antigravity") &&
            agyAccounts.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[var(--t-ink)]">Google Antigravity</span>
                  <span className="text-[12px] text-[var(--t-ink-6)]">{agyAccounts.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agyAccounts.map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      windows={usageMap[acc.id] || []}
                      onRefresh={onRefreshAccount}
                      onSelect={onSelectAccount}
                    />
                  ))}
                </div>
              </section>
            )}

          {(filterProvider === "all" || filterProvider === "codex") &&
            codexAccounts.length > 0 && (
              <section>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-[var(--t-ink)]">OpenAI Codex</span>
                  <span className="text-[12px] text-[var(--t-ink-6)]">{codexAccounts.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {codexAccounts.map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      windows={usageMap[acc.id] || []}
                      onRefresh={onRefreshAccount}
                      onSelect={onSelectAccount}
                    />
                  ))}
                </div>
              </section>
            )}
        </div>
      )}
    </div>
  );
};