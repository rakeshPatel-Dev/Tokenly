import React from "react";
import { WindowSource } from "../../types";

interface Props {
  source: WindowSource;
  className?: string;
}

export const SourceBadge: React.FC<Props> = ({ source, className = "" }) => {
  const isAppServer = source === "official_app_server";

  return (
    <span
      className={`font-mono text-[10px] tracking-wider uppercase text-stone-500 hover:text-stone-400 transition-colors ${className}`}
      title={
        isAppServer
          ? "Codex local app-server JSON-RPC"
          : "Google Antigravity CLI (/usage JSON)"
      }
    >
      via {isAppServer ? "app-server" : "agy cli"}
    </span>
  );
};
