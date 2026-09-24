import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  resetAt?: string;
  className?: string;
}

export const ResetCountdown: React.FC<Props> = ({ resetAt, className = "" }) => {
  const [timeText, setTimeText] = useState("");
  const [exact, setExact] = useState("");
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    if (!resetAt) {
      setTimeText("");
      setExact("");
      setSoon(false);
      return;
    }

    const update = () => {
      const target = new Date(resetAt).getTime();
      try {
        setExact(
          new Date(resetAt).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        setExact(resetAt);
      }

      if (Number.isNaN(target)) {
        setTimeText("unknown");
        setSoon(false);
        return;
      }

      const diff = target - Date.now();
      setSoon(diff > 0 && diff < 86400000);

      if (diff <= 0) {
        setTimeText("now");
        return;
      }

      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);

      if (d > 0) setTimeText(`${d}d ${h}h`);
      else if (h > 0) setTimeText(`${h}h ${m}m`);
      else setTimeText(`${Math.max(1, m)}m`);
    };

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [resetAt]);

  if (!resetAt) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
      title={exact ? `Resets ${exact}` : undefined}
    >
      <Clock className={`h-3 w-3 shrink-0 ${soon ? "text-[var(--t-amber)]" : "text-[var(--t-ink-7)]"}`} />
      <span>
        resets{" "}
        <span className={soon ? "text-[var(--t-amber)]" : "text-[var(--t-ink-5)]"}>{timeText}</span>
      </span>
    </span>
  );
};