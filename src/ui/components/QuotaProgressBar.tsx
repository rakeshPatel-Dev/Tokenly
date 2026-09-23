import React from "react";

interface Props {
  remainingPercent?: number;
  usedPercent?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const QuotaProgressBar: React.FC<Props> = ({
  remainingPercent,
  usedPercent,
  showText = true,
  size = "md",
}) => {
  if (remainingPercent === undefined && usedPercent === undefined) {
    return (
      <div className="w-full">
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-slate-800 w-full animate-pulse" />
        </div>
        {showText && (
          <div className="text-[11px] text-slate-500 mt-1 font-mono tracking-wide">
            Quota unavailable
          </div>
        )}
      </div>
    );
  }

  const rem = remainingPercent ?? (100 - (usedPercent ?? 0));
  const normalized = Math.max(0, Math.min(100, rem));

  // Solid color tiers — no gradients
  let barColor = "bg-blue-500";
  let percentColor = "text-blue-400";

  if (normalized < 20) {
    barColor = "bg-rose-600";
    percentColor = "text-rose-400";
  } else if (normalized < 50) {
    barColor = "bg-blue-600";
    percentColor = "text-blue-300";
  }

  const heightClass = size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className="w-full space-y-2">
      <div className={`w-full ${heightClass} bg-[#111827] rounded-full overflow-hidden border border-blue-950/40`}>
        <div
          className={`${heightClass} ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${normalized}%` }}
        />
      </div>

      {showText && (
        <div className="flex items-center justify-between text-[11px] font-mono tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${percentColor} tabular-nums text-xs`}>
              {normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}%
            </span>
            <span className="text-slate-500 uppercase text-[10px] tracking-wider">
              remaining
            </span>
          </div>
          <span className="text-slate-500 text-[10px] tabular-nums">
            {(100 - normalized).toFixed(0)}% used
          </span>
        </div>
      )}
    </div>
  );
};
