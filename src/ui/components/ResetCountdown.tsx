import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  resetAt?: string;
  className?: string;
}

export const ResetCountdown: React.FC<Props> = ({ resetAt, className = "" }) => {
  const [timeText, setTimeText] = useState<string>("");
  const [exactDateText, setExactDateText] = useState<string>("");

  useEffect(() => {
    if (!resetAt) {
      setTimeText("No reset");
      setExactDateText("");
      return;
    }

    const update = () => {
      const target = new Date(resetAt).getTime();
      const now = Date.now();
      const diffMs = target - now;

      try {
        const dateObj = new Date(resetAt);
        setExactDateText(
          dateObj.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        setExactDateText(resetAt);
      }

      if (isNaN(target)) {
        setTimeText("Unknown");
        return;
      }

      if (diffMs <= 0) {
        setTimeText("Resetting");
        return;
      }

      const diffSecs = Math.floor(diffMs / 1000);
      const days = Math.floor(diffSecs / 86400);
      const hours = Math.floor((diffSecs % 86400) / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);

      if (days > 0) {
        setTimeText(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeText(`${hours}h ${minutes}m`);
      } else {
        setTimeText(`${Math.max(1, minutes)}m`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [resetAt]);

  if (!resetAt) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] text-stone-400 ${className}`}
      title={exactDateText ? `Exact reset: ${exactDateText}` : undefined}
    >
      <Clock className="w-3 h-3 text-blue-500/70 shrink-0" />
      <span>resets in <span className="text-blue-200/90 font-medium">{timeText}</span></span>
    </div>
  );
};
