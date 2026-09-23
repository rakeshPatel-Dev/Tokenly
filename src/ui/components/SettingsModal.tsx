import React, { useEffect, useState } from "react";
import { api } from "../../core/api";
import { X, SlidersHorizontal, CheckCircle2, Cpu } from "lucide-react";

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

  const ProviderRow = ({
    name,
    ver,
    note,
  }: {
    name: string;
    ver: string | null;
    note: string;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-blue-950/25 last:border-0 font-mono text-xs">
      <div>
        <div className="text-stone-200 font-medium">{name}</div>
        <div className="text-stone-500 text-[10px] mt-0.5">{note}</div>
      </div>
      {ver ? (
        <span className="px-2 py-0.5 rounded-full bg-blue-950/30 border border-blue-500/20 text-blue-400 text-[10px] tracking-wide">
          v{ver}
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-500 text-[10px]">
          Not detected
        </span>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="textured-blue-card rounded-4xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="relative z-10">
          {/* Header */}
          <div className="p-6 border-b border-blue-950/40 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                Preferences
              </h2>
              <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                Refresh intervals · CLI provider status
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-blue-950/30 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Refresh Intervals */}
            <div>
              <h3 className="font-mono text-[10px] tracking-widest uppercase font-semibold text-stone-400 mb-3.5">
                Background Refresh
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-medium text-stone-200">
                      Foreground interval
                    </label>
                    <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                      When Tokenly window is active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={fgInterval}
                      onChange={(e) => setFgInterval(e.target.value)}
                      min={15}
                      max={3600}
                      className="w-20 bg-[#0c1020] border border-blue-950/50 rounded-2xl px-2.5 py-1.5 text-xs font-mono text-stone-100 text-right focus:outline-none focus:border-blue-500/50"
                    />
                    <span className="font-mono text-[10px] text-stone-500">sec</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-medium text-stone-200">
                      Background interval
                    </label>
                    <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                      When minimized to system tray
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={bgInterval}
                      onChange={(e) => setBgInterval(e.target.value)}
                      min={60}
                      max={86400}
                      className="w-20 bg-[#0c1020] border border-blue-950/50 rounded-2xl px-2.5 py-1.5 text-xs font-mono text-stone-100 text-right focus:outline-none focus:border-blue-500/50"
                    />
                    <span className="font-mono text-[10px] text-stone-500">sec</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Health */}
            <div className="pt-1">
              <h3 className="font-mono text-[10px] tracking-widest uppercase font-semibold text-stone-400 mb-1 flex items-center gap-2">
                <Cpu className="w-3 h-3 text-blue-500" />
                Local CLI Status
              </h3>
              <div className="mt-2.5 bg-[#090d18]/90 rounded-3xl border border-blue-950/40 px-4 divide-y divide-blue-950/25">
                <ProviderRow
                  name="Google Antigravity (agy)"
                  ver={agyVer}
                  note={agyVer ? "~/.local/bin/agy · authenticated" : "Install: agy"}
                />
                <ProviderRow
                  name="OpenAI Codex"
                  ver={codexVer}
                  note={codexVer ? "~/.local/bin/codex · detected" : "Install via codex.com"}
                />
              </div>
            </div>

            {/* Background notice */}
            <div className="p-3 rounded-3xl bg-[#101828]/80 border border-blue-900/30 font-mono text-[11px] text-stone-400 leading-relaxed">
              💡 Background refresh runs continuously via a native Rust thread — quotas update
              even when Tokenly is minimized to tray.
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md font-sans"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : saving ? (
                "Saving..."
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
