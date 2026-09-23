import React, { useState } from "react";
import { Account, UsageWindow } from "../../types";
import { AccountCard } from "./AccountCard";
import { Plus, Search, Radio, Compass } from "lucide-react";

interface Props {
  accounts: Account[];
  usageMap: Record<string, UsageWindow[]>;
  onRefreshAccount: (accountId: string) => Promise<void>;
  onSelectAccount: (account: Account) => void;
  onOpenAddModal: () => void;
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

  // Determine optimal account for next task
  let bestAccount: { account: Account; remainingPercent: number; name: string } | null = null;
  let nextResetAccount: { account: Account; resetAt: string; windowName: string } | null = null;
  let earliestResetTime = Infinity;

  for (const acc of accounts) {
    const windows = usageMap[acc.id] || [];
    for (const w of windows) {
      if (w.remainingPercent !== undefined) {
        if (!bestAccount || w.remainingPercent > bestAccount.remainingPercent) {
          bestAccount = {
            account: acc,
            remainingPercent: w.remainingPercent,
            name: w.name,
          };
        }
      }
      if (w.resetAt) {
        const time = new Date(w.resetAt).getTime();
        if (!isNaN(time) && time > Date.now() && time < earliestResetTime) {
          earliestResetTime = time;
          nextResetAccount = {
            account: acc,
            resetAt: w.resetAt,
            windowName: w.name,
          };
        }
      }
    }
  }

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (filterProvider !== "all" && acc.provider !== filterProvider) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (acc.displayName || "").toLowerCase().includes(q);
      const matchEmail = (acc.email || "").toLowerCase().includes(q);
      const matchProfile = (acc.authProfileId || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchProfile) return false;
    }
    return true;
  });

  const codexAccounts = filteredAccounts.filter((a) => a.provider === "codex");
  const agyAccounts = filteredAccounts.filter((a) => a.provider === "antigravity");

  return (
    <div className="space-y-7">
      {/* Top Editorial Intel: Deep Amber Textured Hero Cards */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
          {/* Card 1: Recommended Profile */}
          <div className="textured-hero-card rounded-4xl p-6 transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-blue-400 uppercase font-semibold">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                Optimal Quota Available
              </div>

              {bestAccount ? (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-semibold tracking-tight text-stone-100">
                      {bestAccount.account.displayName || bestAccount.account.provider}
                    </span>
                    <span className="font-mono text-xs text-blue-300/80">
                      {bestAccount.account.email || bestAccount.account.authProfileId}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-stone-400 mt-1">
                    <span className="text-blue-400 font-bold">
                      {bestAccount.remainingPercent.toFixed(0)}%
                    </span>{" "}
                    capacity remaining on {bestAccount.name}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-mono text-stone-500 mt-3">
                  Sync accounts to calculate quota recommendations.
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Next Refresh Window */}
          <div className="textured-hero-card rounded-4xl p-6 transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-blue-400 uppercase font-semibold">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                Upcoming Window Reset
              </div>

              {nextResetAccount ? (
                <div className="mt-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-semibold tracking-tight text-stone-100">
                      {nextResetAccount.account.displayName || nextResetAccount.account.provider}
                    </span>
                    <span className="font-mono text-xs text-stone-400">
                      ({nextResetAccount.windowName})
                    </span>
                  </div>
                  <p className="text-xs font-mono text-blue-300 mt-1">
                    {new Date(nextResetAccount.resetAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-mono text-stone-500 mt-3">
                  No active reset timers reported by providers.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 bg-[#0b0f1a] p-1 rounded-2xl border border-blue-950/40 w-full sm:w-auto">
          <button
            onClick={() => setFilterProvider("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
              filterProvider === "all"
                ? "bg-[#142040] text-blue-300 font-medium shadow-sm border border-blue-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            All ({accounts.length})
          </button>
          <button
            onClick={() => setFilterProvider("codex")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
              filterProvider === "codex"
                ? "bg-[#142040] text-blue-300 font-medium shadow-sm border border-blue-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Codex ({accounts.filter((a) => a.provider === "codex").length})
          </button>
          <button
            onClick={() => setFilterProvider("antigravity")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
              filterProvider === "antigravity"
                ? "bg-[#142040] text-blue-300 font-medium shadow-sm border border-blue-500/20"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Antigravity ({accounts.filter((a) => a.provider === "antigravity").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter profiles or emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0f1a] border border-blue-950/40 rounded-2xl pl-9 pr-3.5 py-1.5 text-xs font-mono text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-600/40"
          />
        </div>
      </div>

      {/* Main Grid with 4xl rounded textured cards */}
      {filteredAccounts.length === 0 ? (
        <div className="p-16 text-center rounded-4xl textured-blue-card border border-blue-950/40 space-y-4">
          <div className="relative z-10 max-w-sm mx-auto space-y-3">
            <h3 className="text-base font-semibold text-stone-200">No accounts configured</h3>
            <p className="text-xs font-mono text-stone-500 leading-relaxed">
              {accounts.length === 0
                ? "Connect your local OpenAI Codex and Google Antigravity profiles to inspect quota balances."
                : "No accounts matched your current filter criteria."}
            </p>
            {accounts.length === 0 && (
              <button
                onClick={onOpenAddModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add First Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Antigravity Section */}
          {(filterProvider === "all" || filterProvider === "antigravity") &&
            agyAccounts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3.5 font-mono text-[11px] font-semibold text-blue-400/90 uppercase tracking-widest pl-1">
                  Google Antigravity
                  <span className="text-stone-600">({agyAccounts.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              </div>
            )}

          {/* Codex Section */}
          {(filterProvider === "all" || filterProvider === "codex") &&
            codexAccounts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3.5 font-mono text-[11px] font-semibold text-blue-400/90 uppercase tracking-widest pl-1">
                  OpenAI Codex
                  <span className="text-stone-600">({codexAccounts.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              </div>
            )}
        </div>
      )}
    </div>
  );
};
