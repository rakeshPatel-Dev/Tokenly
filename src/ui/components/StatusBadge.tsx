import React from "react";
import { ConnectionStatus } from "../../types";

interface Props {
  status: ConnectionStatus;
  className?: string;
}

export const StatusBadge: React.FC<Props> = ({ status, className = "" }) => {
  switch (status) {
    case "connected":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-stone-400 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          Active
        </span>
      );
    case "refreshing":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-blue-400 animate-pulse ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
          Syncing
        </span>
      );
    case "stale":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-blue-500/80 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Stale
        </span>
      );
    case "unauthenticated":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-rose-400 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
          Auth Required
        </span>
      );
    case "identity_unverified":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-blue-300/80 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80" />
          Unverified
        </span>
      );
    case "unavailable":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-stone-500 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-stone-600" />
          Offline
        </span>
      );
    case "error":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase text-rose-400 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Error
        </span>
      );
  }
};
