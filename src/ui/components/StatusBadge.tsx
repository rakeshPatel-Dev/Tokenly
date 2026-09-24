import React from "react";
import { ConnectionStatus } from "../../types";

interface Props {
  status: ConnectionStatus;
  className?: string;
}

const config: Record<ConnectionStatus, { label: string; dot: string; text: string }> = {
  connected: { label: "Active", dot: "mark mark-green", text: "text-[var(--t-green)]" },
  refreshing: { label: "Syncing", dot: "mark mark-amber", text: "text-[var(--t-amber)]" },
  stale: { label: "Outdated", dot: "mark mark-amber", text: "text-[var(--t-amber)]" },
  unavailable: { label: "Offline", dot: "mark mark-red", text: "text-[var(--t-red)]" },
  unauthenticated: { label: "Signed out", dot: "mark mark-red", text: "text-[var(--t-red)]" },
  identity_unverified: { label: "Unverified", dot: "mark mark-amber", text: "text-[var(--t-amber)]" },
  unsupported: { label: "Unsupported", dot: "mark mark-gray", text: "text-[var(--t-ink-5)]" },
  error: { label: "Error", dot: "mark mark-red", text: "text-[var(--t-red)]" },
};

export const StatusBadge: React.FC<Props> = ({ status, className = "" }) => {
  const cfg = config[status] ?? config.error;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] ${cfg.text} ${className}`}>
      <span className={cfg.dot} />
      {cfg.label}
    </span>
  );
};