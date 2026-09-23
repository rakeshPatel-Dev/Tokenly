import React, { useState } from "react";
import { Account, UsageWindow, ConnectionStatus } from "../../types";
import { QuotaProgressBar } from "./QuotaProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { SourceBadge } from "./SourceBadge";
import { StatusBadge } from "./StatusBadge";
import { RefreshCw, ArrowUpRight } from "lucide-react";

interface Props {
  account: Account;
  windows: UsageWindow[];
  onRefresh: (accountId: string) => Promise<void>;
  onSelect: (account: Account) => void;
}

export const AccountCard: React.FC<Props> = ({
  account,
  windows,
  onRefresh,
  onSelect,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isCodex = account.provider === "codex";
  const primaryWindow = windows[0];
  const secondaryWindow = windows.length > 1 ? windows[1] : undefined;
  const additionalWindows = windows.slice(2);

  const handleRefreshClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsRefreshing(true);
      await onRefresh(account.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  let status: ConnectionStatus = "connected";
  if (isRefreshing) {
    status = "refreshing";
  } else if (!account.enabled) {
    status = "unavailable";
  } else if (!account.email && !isCodex) {
    status = "identity_unverified";
  } else if (windows.length === 0 && account.lastCheckedAt) {
    status = "stale";
  }

  const getUpdatedText = () => {
    if (!account.lastCheckedAt) return "Not synced";
    const diffMs = Date.now() - new Date(account.lastCheckedAt).getTime();
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return `${Math.max(1, secs)}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  return (
    <div
      onClick={() => onSelect(account)}
      className="textured-blue-card rounded-4xl p-6.5 transition-all duration-300 cursor-pointer group hover:border-blue-500/35 hover:-translate-y-0.5 flex flex-col justify-between"
    >
      {/* Top Header: Provider Label & Subtle Indicators */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-blue-950/40">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${
                isCodex
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-blue-600/10 text-blue-300 border border-blue-600/20"
              }`}
            >
              {isCodex ? "OpenAI Codex" : "Google Antigravity"}
            </span>

            {account.plan && (
              <span className="font-mono text-[10px] text-stone-400 bg-stone-900/80 px-2 py-0.5 rounded-full border border-stone-800">
                {account.plan}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <StatusBadge status={status} />
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              title="Refresh quota now"
              className="p-1.5 text-stone-500 hover:text-blue-300 hover:bg-blue-950/30 rounded-full transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Account Identity */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-stone-100 group-hover:text-blue-200 transition-colors flex items-center gap-1.5">
              <span>{account.displayName || (isCodex ? "Codex Profile" : "Antigravity")}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </h3>
          </div>
          <div className="text-xs text-stone-400 font-mono flex items-center gap-1.5 mt-1">
            {account.email ? (
              <span className="text-stone-300">{account.email}</span>
            ) : (
              <span className="text-blue-400/80 italic">Identity unverified</span>
            )}
            {account.authProfileId && (
              <span className="text-stone-600">
                · {account.authProfileId.split("/").pop()}
              </span>
            )}
          </div>
        </div>

        {/* Quota Usage Windows */}
        <div className="mt-5 space-y-3.5">
          {windows.length === 0 ? (
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-900 text-center font-mono text-[11px] text-stone-500">
              No quota metrics returned yet. Click refresh to sync.
            </div>
          ) : (
            <>
              {/* Primary Window */}
              {primaryWindow && (
                <div className="p-4 rounded-2xl bg-[#090e18]/80 border border-blue-950/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-200">
                    <span className="truncate pr-2 text-stone-300">{primaryWindow.name}</span>
                    <ResetCountdown resetAt={primaryWindow.resetAt} />
                  </div>
                  <QuotaProgressBar
                    remainingPercent={primaryWindow.remainingPercent}
                    usedPercent={primaryWindow.usedPercent}
                  />
                </div>
              )}

              {/* Secondary Window */}
              {secondaryWindow && (
                <div className="p-3.5 rounded-2xl bg-[#090e18]/50 border border-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-stone-300">
                    <span className="truncate pr-2 text-stone-400">{secondaryWindow.name}</span>
                    <ResetCountdown resetAt={secondaryWindow.resetAt} />
                  </div>
                  <QuotaProgressBar
                    remainingPercent={secondaryWindow.remainingPercent}
                    usedPercent={secondaryWindow.usedPercent}
                    size="sm"
                  />
                </div>
              )}

              {/* Additional windows indicator */}
              {additionalWindows.length > 0 && (
                <div className="text-[10px] font-mono text-stone-500 text-right pr-1">
                  +{additionalWindows.length} more {additionalWindows.length === 1 ? "limit" : "limits"} in details
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="mt-6 pt-3.5 border-t border-blue-950/30 flex items-center justify-between text-[11px] font-mono text-stone-500 relative z-10">
        <span className="flex items-center gap-1.5 text-stone-400">
          <span className="w-1 h-1 rounded-full bg-blue-500/60" />
          synced {getUpdatedText()}
        </span>

        {primaryWindow ? (
          <SourceBadge source={primaryWindow.source} />
        ) : (
          <span className="text-stone-600 text-[10px]">
            {isCodex ? "via app-server" : "via agy cli"}
          </span>
        )}
      </div>
    </div>
  );
};
