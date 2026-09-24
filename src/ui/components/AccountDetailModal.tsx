import React, { useEffect, useState } from "react";
import { Account, UsageWindow } from "../../types";
import { api } from "../../core/api";
import { QuotaProgressBar } from "./QuotaProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { X, RefreshCw, Unplug, Layers, History } from "lucide-react";

interface Props {
  account: Account | null;
  onClose: () => void;
  onRefresh: (accountId: string) => Promise<void>;
  onDelete: (accountId: string) => Promise<void>;
}

export const AccountDetailModal: React.FC<Props> = ({
  account,
  onClose,
  onRefresh,
  onDelete,
}) => {
  const [windows, setWindows] = useState<UsageWindow[]>([]);
  const [history, setHistory] = useState<UsageWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!account) return;
    const load = async () => {
      setLoading(true);
      try {
        const [latest, hist] = await Promise.all([
          api.getLatestUsage(account.id),
          api.getUsageHistory(account.id, 25),
        ]);
        setWindows(latest);
        setHistory(hist);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [account]);

  if (!account) return null;

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh(account.id);
      const [latest, hist] = await Promise.all([
        api.getLatestUsage(account.id),
        api.getUsageHistory(account.id, 25),
      ]);
      setWindows(latest);
      setHistory(hist);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Disconnect "${account.displayName || account.id}"? This clears its saved usage history.`
      )
    ) {
      return;
    }
    try {
      setIsDeleting(true);
      await onDelete(account.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const isCodex = account.provider === "codex";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--t-scrim)] p-4">
      <div className="panel-modal flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--t-line)] px-6 py-5">
          <div>
            <div className="flex items-baseline gap-1.5 text-[11.5px] text-[var(--t-ink-5)]">
              <span>{isCodex ? "OpenAI Codex" : "Google Antigravity"}</span>
              {account.plan && <span className="text-[var(--t-ink-8)]">· {account.plan}</span>}
            </div>
            <h2 className="mt-1 text-[17px] font-semibold text-[var(--t-ink)]">
              {account.displayName || (isCodex ? "Codex" : "Antigravity")}
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--t-ink-5)]">
              {account.email || "Not signed in"}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-px border border-[var(--t-line)] bg-[var(--t-line)] sm:grid-cols-4">
            <div className="bg-[var(--t-surface-2)] p-3.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--t-ink-8)]">Profile</div>
              <div className="mt-1 truncate text-[12px] text-[var(--t-ink-3)]" title={account.authProfileId}>
                {account.authProfileId.split("/").pop() || "Default"}
              </div>
            </div>
            <div className="bg-[var(--t-surface-2)] p-3.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--t-ink-8)]">Plan</div>
              <div className="mt-1 text-[12px] text-[var(--t-ink-3)]">{account.plan || "—"}</div>
            </div>
            <div className="bg-[var(--t-surface-2)] p-3.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--t-ink-8)]">Last check</div>
              <div className="mt-1 text-[12px] text-[var(--t-ink-3)]">
                {account.lastCheckedAt
                  ? new Date(account.lastCheckedAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Never"}
              </div>
            </div>
            <div className="bg-[var(--t-surface-2)] p-3.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--t-ink-8)]">Status</div>
              <div className="mt-1 text-[12px] text-[var(--t-ink-2)]">
                {account.enabled ? "Active" : "Offline"}
              </div>
            </div>
          </div>

          {/* Limits */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--t-ink-2)]">
              <Layers className="h-3.5 w-3.5 text-[var(--t-ink-7)]" />
              Limits
            </h3>

            {loading ? (
              <div className="panel-well px-4 py-8 text-center text-[12px] text-[var(--t-ink-5)]">
                Loading…
              </div>
            ) : windows.length === 0 ? (
              <div className="panel-well px-4 py-8 text-center text-[12px] text-[var(--t-ink-5)]">
                No limit data returned by the provider yet.
              </div>
            ) : (
              <div className="space-y-3">
                {windows.map((w) => (
                  <div key={w.id} className="panel-well space-y-2.5 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="truncate text-[13px] font-medium text-[var(--t-ink-2)]">
                          {w.name}
                        </span>
                        <span className="shrink-0 text-[11px] capitalize text-[var(--t-ink-6)]">
                          {w.windowType} limit
                        </span>
                      </span>
                      <ResetCountdown resetAt={w.resetAt} className="shrink-0 text-[11px] text-[var(--t-ink-6)]" />
                    </div>
                    <QuotaProgressBar
                      remainingPercent={w.remainingPercent}
                      usedPercent={w.usedPercent}
                      size="md"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--t-ink-2)]">
              <History className="h-3.5 w-3.5 text-[var(--t-ink-7)]" />
              Recent
            </h3>

            {history.length === 0 ? (
              <div className="panel-well px-4 py-6 text-center text-[12px] text-[var(--t-ink-5)]">
                No history yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--t-line)] border border-[var(--t-line)] bg-[var(--t-surface-2)]">
                {history.slice(0, 10).map((h) => {
                  const rem = h.remainingPercent;
                  const low = rem !== undefined && rem < 20;
                  const mid = rem !== undefined && rem < 50;
                  return (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2.5 text-[12px]">
                      <div className="min-w-0">
                        <span className="truncate text-[var(--t-ink-3)]">{h.name}</span>
                        <div className="mt-0.5 text-[10.5px] text-[var(--t-ink-8)]">
                          {new Date(h.fetchedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {rem !== undefined ? (
                        <span
                          className={`num ml-4 shrink-0 font-medium ${
                            low ? "text-[var(--t-red)]" : mid ? "text-[var(--t-amber)]" : "text-[var(--t-green)]"
                          }`}
                        >
                          {low && <span className="font-semibold">Low · </span>}
                          {rem.toFixed(1)}% left
                        </span>
                      ) : (
                        <span className="ml-4 shrink-0 text-[var(--t-ink-8)]">Unavailable</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--t-line)] px-6 py-4">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-danger"
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-amber"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Check now
            </button>
            <button onClick={onClose} className="btn btn-ghost">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};