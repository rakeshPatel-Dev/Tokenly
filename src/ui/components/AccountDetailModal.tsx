import React, { useEffect, useState } from "react";
import { Account, UsageWindow } from "../../types";
import { api } from "../../core/api";
import { QuotaProgressBar } from "./QuotaProgressBar";
import { ResetCountdown } from "./ResetCountdown";
import { SourceBadge } from "./SourceBadge";
import {
  X,
  RefreshCw,
  Trash2,
  Calendar,
  Layers,
  History,
} from "lucide-react";

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
        `Are you sure you want to disconnect "${account.displayName || account.id}"? This will clear its local usage snapshots.`
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="textured-blue-card rounded-4xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-blue-950/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full ${
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
              <h2 className="text-xl font-semibold text-stone-100 mt-2">
                {account.displayName || (isCodex ? "Codex Profile" : "Antigravity")}
              </h2>
              <p className="text-xs font-mono text-stone-400 mt-0.5">
                {account.email || "Identity unverified"}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-blue-950/30 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Meta Inset */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#090d18]/80 p-4 rounded-3xl border border-blue-950/40 text-xs font-mono">
              <div>
                <div className="text-stone-500 text-[10px] uppercase">Account ID</div>
                <div className="text-stone-300 mt-1 truncate">
                  {account.providerAccountId || "Default"}
                </div>
              </div>
              <div>
                <div className="text-stone-500 text-[10px] uppercase">Profile</div>
                <div className="text-stone-300 mt-1 truncate" title={account.authProfileId}>
                  {account.authProfileId.split("/").pop()}
                </div>
              </div>
              <div>
                <div className="text-stone-500 text-[10px] uppercase">Last Checked</div>
                <div className="text-stone-300 mt-1 truncate">
                  {account.lastCheckedAt
                    ? new Date(account.lastCheckedAt).toLocaleTimeString()
                    : "Never"}
                </div>
              </div>
              <div>
                <div className="text-stone-500 text-[10px] uppercase">Status</div>
                <div className="text-blue-400 mt-1 font-semibold">Active</div>
              </div>
            </div>

            {/* Quota Limits */}
            <div>
              <h3 className="font-mono text-xs tracking-wider uppercase text-stone-400 flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Active Quota Limits
              </h3>

              {loading ? (
                <div className="p-6 text-center text-xs font-mono text-stone-500 animate-pulse">
                  Querying local CLI...
                </div>
              ) : windows.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-stone-500 bg-[#090e18]/80 rounded-3xl border border-blue-950/30">
                  No active quota windows returned by provider.
                </div>
              ) : (
                <div className="space-y-3">
                  {windows.map((w) => (
                    <div
                      key={w.id}
                      className="p-4 rounded-3xl bg-[#090e18]/90 border border-blue-950/30 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm text-stone-200">
                            {w.name}
                          </span>
                          <div className="text-[10px] font-mono text-stone-500 flex items-center gap-2 mt-0.5">
                            <span className="capitalize">{w.windowType} window</span>
                            <span>•</span>
                            <SourceBadge source={w.source} />
                          </div>
                        </div>
                        <ResetCountdown resetAt={w.resetAt} />
                      </div>

                      <QuotaProgressBar
                        remainingPercent={w.remainingPercent}
                        usedPercent={w.usedPercent}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Snapshot History */}
            <div>
              <h3 className="font-mono text-xs tracking-wider uppercase text-stone-400 flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5 text-blue-500" />
                Snapshot History
              </h3>

              {history.length === 0 ? (
                <div className="p-4 text-center text-xs font-mono text-stone-500 bg-[#090e18]/80 rounded-3xl border border-blue-950/30">
                  No snapshots recorded yet.
                </div>
              ) : (
                <div className="bg-[#090e18]/90 rounded-3xl border border-blue-950/30 divide-y divide-blue-950/20 max-h-48 overflow-y-auto">
                  {history.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="px-4 py-2.5 flex items-center justify-between text-xs font-mono hover:bg-[#0d1120]/60"
                    >
                      <div>
                        <span className="text-stone-300 font-medium">{h.name}</span>
                        <div className="text-[10px] text-stone-600 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-stone-600" />
                          <span>
                            {new Date(h.fetchedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        {h.remainingPercent !== undefined ? (
                          <span
                            className={`font-semibold tabular-nums ${
                              h.remainingPercent < 20
                                ? "text-rose-400"
                                : h.remainingPercent < 50
                                ? "text-blue-400"
                                : "text-blue-300"
                            }`}
                          >
                            {h.remainingPercent.toFixed(1)}% remaining
                          </span>
                        ) : (
                          <span className="text-stone-600">Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-blue-950/40 flex items-center justify-between">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/20 border border-rose-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Disconnect
            </button>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono text-stone-200 bg-[#111b2e] hover:bg-[#141e32] border border-blue-900/40 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
                />
                Sync Quota
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
