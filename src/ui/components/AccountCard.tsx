import React, { useState } from "react";
import { Account, UsageWindow, ConnectionStatus } from "../../types";
import { QuotaProgressBar } from "./QuotaProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { StatusBadge } from "./StatusBadge";
import { RefreshCw } from "lucide-react";

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
  const secondaryWindow = windows[1];

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
    if (!account.lastCheckedAt) return "Never";
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
      className="panel panel-hover flex cursor-pointer flex-col p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5 text-[11.5px] text-[var(--t-ink-5)]">
          <span>{isCodex ? "OpenAI Codex" : "Google Antigravity"}</span>
          {account.plan && <span className="text-[var(--t-ink-8)]">· {account.plan}</span>}
        </div>
        <div className="flex items-center gap-1">
          <StatusBadge status={status} />
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            title="Check now"
            className="-mr-1.5 p-1.5 text-[var(--t-ink-8)] hover:bg-[var(--t-raised)] hover:text-[var(--t-ink)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-[14px] font-semibold text-[var(--t-ink)]">
        {account.displayName || (isCodex ? "Codex" : "Antigravity")}
      </h3>
      <p className="mt-0.5 truncate text-[12px] text-[var(--t-ink-5)]">
        {account.email || account.authProfileId.split("/").pop() || "Not signed in"}
      </p>

      <div className="divider mt-4" />

      <div className="mt-4 space-y-4">
        {windows.length === 0 ? (
          <p className="py-1 text-center text-[12px] text-[var(--t-ink-8)]">
            No data yet — press Sync.
          </p>
        ) : (
          <>
            {primaryWindow && (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] text-[var(--t-ink-3)]">{primaryWindow.name}</span>
                  <ResetCountdown resetAt={primaryWindow.resetAt} className="shrink-0 text-[11px] text-[var(--t-ink-6)]" />
                </div>
                <QuotaProgressBar
                  remainingPercent={primaryWindow.remainingPercent}
                  usedPercent={primaryWindow.usedPercent}
                  size="sm"
                />
              </div>
            )}

            {secondaryWindow && (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] text-[var(--t-ink-4)]">{secondaryWindow.name}</span>
                  <ResetCountdown resetAt={secondaryWindow.resetAt} className="shrink-0 text-[11px] text-[var(--t-ink-7)]" />
                </div>
                <QuotaProgressBar
                  remainingPercent={secondaryWindow.remainingPercent}
                  usedPercent={secondaryWindow.usedPercent}
                  size="sm"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="divider mt-4" />
      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--t-ink-7)]">
        <span>Updated {getUpdatedText()}</span>
      </div>
    </div>
  );
};