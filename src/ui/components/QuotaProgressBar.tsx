import React from "react";

interface Props {
  remainingPercent?: number;
  usedPercent?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-[3px]",
  md: "h-[5px]",
  lg: "h-2",
};

function tier(normalized: number) {
  if (normalized < 20) return { fill: "bg-[var(--t-red)]", text: "text-[var(--t-red)]" };
  if (normalized < 50) return { fill: "bg-[var(--t-amber)]", text: "text-[var(--t-amber)]" };
  return { fill: "bg-[var(--t-green)]", text: "text-[var(--t-green)]" };
}

export const QuotaProgressBar: React.FC<Props> = ({
  remainingPercent,
  usedPercent,
  showText = true,
  size = "md",
}) => {
  if (remainingPercent === undefined && usedPercent === undefined) {
    return (
      <div className="space-y-1.5">
        <div className={`track ${sizes[size]} overflow-hidden`}>
          <div className={`fill ${sizes[size]} w-0`} />
        </div>
        {showText && <p className="text-[11px] text-[var(--t-ink-8)]">No data</p>}
      </div>
    );
  }

  const rem = remainingPercent ?? (100 - (usedPercent ?? 0));
  const normalized = Math.max(0, Math.min(100, rem));
  const t = tier(normalized);

  return (
    <div className="space-y-1.5">
      <div className={`track ${sizes[size]} overflow-hidden`}>
        <div
          className={`fill ${sizes[size]} ${t.fill}`}
          style={{ width: `${normalized}%` }}
        />
      </div>

      {showText && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5">
            {normalized < 20 && <span className={`font-medium ${t.text}`}>Low</span>}
            <span className={`num font-medium ${t.text}`}>
              {normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}%
            </span>
            <span className="text-[var(--t-ink-6)]">left</span>
          </span>
          <span className="num text-[var(--t-ink-8)]">
            {(100 - normalized).toFixed(0)}% used
          </span>
        </div>
      )}
    </div>
  );
};