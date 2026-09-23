import React from "react";
import { Plus, RefreshCw, SlidersHorizontal, Activity } from "lucide-react";

interface Props {
  accountCount: number;
  isRefreshing: boolean;
  onRefreshAll: () => Promise<void>;
  onOpenAddModal: () => void;
  onOpenSettings: () => void;
  nextResetText?: string;
}

export const Header: React.FC<Props> = ({
  accountCount,
  isRefreshing,
  onRefreshAll,
  onOpenAddModal,
  onOpenSettings,
  nextResetText,
}) => {
  return (
    <header className="border-b border-blue-950/40 bg-[#080c12]/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand & Micro-metrics */}
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center ">
            <div className="w-full h-full bg-[#120e0b] rounded-[15px] flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-stone-100 font-sans">
                Tokenly
              </h1>
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400/90 border border-blue-900/30">
                Local
              </span>
            </div>
            <p className="text-[11px] font-mono text-stone-500 flex items-center gap-2 mt-0.5">
              <span>{accountCount} {accountCount === 1 ? "profile" : "profiles"} monitored</span>
              {nextResetText && (
                <>
                  <span className="text-stone-700">•</span>
                  <span className="text-blue-400/90">
                    next reset {nextResetText}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-stone-300 bg-[#0d1120] hover:bg-[#131c30] border border-blue-900/30 hover:border-blue-700/50 transition-colors shadow-sm"
            title="Refresh all monitored accounts"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : "text-stone-400"}`}
            />
            <span className="hidden sm:inline">Sync All</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-200 bg-[#0d1120] hover:bg-[#131c30] border border-blue-900/30 hover:border-blue-700/50 transition-colors"
            title="Preferences & CLI Health"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all  font-sans"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Add Account</span>
          </button>
        </div>
      </div>
    </header>
  );
};
