import React, { useEffect, useState } from "react";
import { api } from "../../core/api";
import { X, CheckCircle2, Settings, Terminal, Server } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [fgInterval, setFgInterval] = useState("60");
  const [bgInterval, setBgInterval] = useState("300");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codexVer, setCodexVer] = useState<string | null>(null);
  const [agyVer, setAgyVer] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      const fg = (await api.getSetting("refresh_fg_seconds")) || "60";
      const bg = (await api.getSetting("refresh_bg_seconds")) || "300";
      setFgInterval(fg);
      setBgInterval(bg);
      setSaved(false);

      try {
        const providers = await api.detectProviders();
        for (const p of providers) {
          if (p.provider === "codex") setCodexVer(p.version || null);
          if (p.provider === "antigravity") setAgyVer(p.version || null);
        }
      } catch {
        // silently ignore
      }
    };
    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const fg = Math.max(15, parseInt(fgInterval, 10) || 60);
      const bg = Math.max(60, parseInt(bgInterval, 10) || 300);
      await api.setSetting("refresh_fg_seconds", fg.toString());
      await api.setSetting("refresh_bg_seconds", bg.toString());
      await api.setRefreshIntervals(fg, bg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  };

  const toolRow = ({
    name,
    ver,
    note,
    icon,
  }: {
    name: string;
    ver: string | null;
    note: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[var(--t-ink-7)]">{icon}</span>
        <div>
          <div className="text-[12.5px] text-[var(--t-ink-2)]">{name}</div>
          <div className="mt-0.5 text-[11px] text-[var(--t-ink-6)]">{note}</div>
        </div>
      </div>
      {ver ? (
        <span className="border border-[var(--t-line-chip)] px-1.5 py-0.5 text-[11px] text-[var(--t-ink-2)]">
          v{ver}
        </span>
      ) : (
        <span className="text-[11px] text-[var(--t-ink-8)]">Not found</span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--t-scrim)] p-4">
      <div className="panel-modal w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--t-line)] px-6 py-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--t-ink)]">
            <Settings className="h-4 w-4" />
            Settings
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Auto-sync */}
          <div>
            <h3 className="mb-3.5 text-[11px] font-medium uppercase tracking-wide text-[var(--t-ink-5)]">
              Auto-sync
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-[12.5px] font-medium text-[var(--t-ink-2)]">
                    While the app is open
                  </label>
                  <p className="mt-0.5 text-[11px] text-[var(--t-ink-6)]">
                    How often to check credits in the foreground
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={fgInterval}
                    onChange={(e) => setFgInterval(e.target.value)}
                    min={15}
                    max={3600}
                    className="input num w-20 px-2.5 py-1.5 text-right text-[12px]"
                  />
                  <span className="text-[11px] text-[var(--t-ink-6)]">sec</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-[12.5px] font-medium text-[var(--t-ink-2)]">
                    While minimized
                  </label>
                  <p className="mt-0.5 text-[11px] text-[var(--t-ink-6)]">
                    How often to check when hidden to the tray
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bgInterval}
                    onChange={(e) => setBgInterval(e.target.value)}
                    min={60}
                    max={86400}
                    className="input num w-20 px-2.5 py-1.5 text-right text-[12px]"
                  />
                  <span className="text-[11px] text-[var(--t-ink-6)]">sec</span>
                </div>
              </div>
            </div>
            <p className="mt-3.5 border-l border-[var(--t-line-hover)] pl-3 text-[11px] leading-relaxed text-[var(--t-ink-6)]">
              Checking continues in the background even when the app is minimized.
            </p>
          </div>

          {/* Installed tools */}
          <div>
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--t-ink-5)]">
              Installed tools
            </h3>
            <div className="divide-y divide-[var(--t-line)] border border-[var(--t-line)] bg-[var(--t-surface-2)]">
              {toolRow({
                name: "Google Antigravity",
                ver: agyVer,
                note: agyVer ? "CLI found" : "Install the agy CLI",
                icon: <Terminal className="h-3.5 w-3.5" />,
              })}
              {toolRow({
                name: "OpenAI Codex",
                ver: codexVer,
                note: codexVer ? "CLI found" : "Install the Codex CLI",
                icon: <Server className="h-3.5 w-3.5" />,
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--t-line)] px-6 py-4">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};