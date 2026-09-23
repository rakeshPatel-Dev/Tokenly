import React, { useState } from "react";
import { Account, ProviderType } from "../../types";
import { api } from "../../core/api";
import { X, CheckCircle, AlertCircle, Loader2, Plus, Terminal, Server } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (account: Account) => void;
}

export const AddAccountModal: React.FC<Props> = ({ isOpen, onClose, onAdded }) => {
  const [provider, setProvider] = useState<ProviderType>("antigravity");
  const [displayName, setDisplayName] = useState("");
  const [authProfileId, setAuthProfileId] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    email?: string;
    plan?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const profilePath = authProfileId.trim() || undefined;
    try {
      if (provider === "antigravity") {
        const res = await api.queryAntigravity(profilePath);
        if (res.success && res.authenticated) {
          setTestResult({
            tested: true,
            success: true,
            message: `Connected to agy CLI (${res.windows.length} quota buckets detected)`,
            email: res.email,
          });
        } else {
          setTestResult({
            tested: true,
            success: false,
            message: res.error || "Failed to communicate with agy CLI",
          });
        }
      } else {
        const res = await api.queryCodex(profilePath);
        if (res.success && res.authenticated) {
          setTestResult({
            tested: true,
            success: true,
            message: `Connected to Codex app-server (${res.windows.length} rate-limit windows detected)`,
            email: res.email,
            plan: res.plan_type,
          });
        } else {
          setTestResult({
            tested: true,
            success: false,
            message: res.error || "Codex authentication required or not running",
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.toString(),
      });
    } finally {
      setTesting(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profile = authProfileId.trim() || (provider === "codex" ? "~/.codex" : "default");
      const id = `${provider}-${Date.now()}`;
      const now = new Date().toISOString();

      const newAccount: Account = {
        id,
        provider,
        displayName: displayName.trim() || (provider === "codex" ? "Codex Account" : "Antigravity Account"),
        authProfileId: profile,
        email: testResult?.email,
        plan: testResult?.plan,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };

      await api.saveAccount(newAccount);
      try {
        await api.refreshAccount(newAccount.id);
      } catch {
        // Handled in state
      }

      onAdded(newAccount);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="textured-blue-card rounded-4xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="relative z-10">
          {/* Header */}
          <div className="p-6 border-b border-blue-950/40 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Connect AI Profile
              </h2>
              <p className="text-xs font-mono text-stone-500 mt-0.5">
                Local CLI integration · zero credentials stored
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-300 hover:bg-blue-950/30 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Provider Tabs */}
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase font-semibold text-stone-400 mb-2">
                Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setProvider("antigravity");
                    setTestResult(null);
                  }}
                  className={`p-3.5 rounded-3xl border text-left flex items-start gap-3 transition-all ${
                    provider === "antigravity"
                      ? "bg-[#0f1a2e] border-blue-500/40 text-blue-300 ring-1 ring-blue-500/20 shadow-md"
                      : "bg-[#0c1020]/80 border-blue-950/40 text-stone-500 hover:border-blue-900/40"
                  }`}
                >
                  <Terminal className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-xs text-stone-200">Google Antigravity</div>
                    <div className="font-mono text-[10px] text-stone-500 mt-0.5">agy CLI /usage</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProvider("codex");
                    setTestResult(null);
                  }}
                  className={`p-3.5 rounded-3xl border text-left flex items-start gap-3 transition-all ${
                    provider === "codex"
                      ? "bg-[#0f1a2e] border-blue-500/40 text-blue-300 ring-1 ring-blue-500/20 shadow-md"
                      : "bg-[#0c1020]/80 border-blue-950/40 text-stone-500 hover:border-blue-900/40"
                  }`}
                >
                  <Server className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-semibold text-xs text-stone-200">OpenAI Codex</div>
                    <div className="font-mono text-[10px] text-stone-500 mt-0.5">app-server rateLimits</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Account Label */}
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase font-semibold text-stone-400 mb-1.5">
                Profile Label
              </label>
              <input
                type="text"
                placeholder="e.g. Work, Personal, College"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0c1020] border border-blue-950/50 rounded-2xl px-3.5 py-2 text-xs font-mono text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {/* Profile Input & Actionable CLI instructions */}
            {provider === "codex" ? (
              <div className="space-y-2">
                <div>
                  <label className="block font-mono text-[10px] tracking-wider uppercase font-semibold text-stone-400 mb-1.5">
                    Profile Directory (<code className="text-blue-400">CODEX_HOME</code>)
                  </label>
                  <input
                    type="text"
                    placeholder="~/.codex (or ~/.codex-work)"
                    value={authProfileId}
                    onChange={(e) => setAuthProfileId(e.target.value)}
                    className="w-full bg-[#0c1020] border border-blue-950/50 rounded-2xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#111828]/80 border border-blue-900/30 text-[11px] font-mono text-stone-400 space-y-1.5">
                  <div className="font-semibold text-blue-400 text-xs">To authenticate a second Codex account:</div>
                  <code className="block bg-[#090e18] px-2.5 py-1.5 rounded-xl text-blue-300 font-mono text-[10px] select-all border border-blue-950/40">
                    CODEX_HOME=~/.codex-work codex login
                  </code>
                  <p className="text-stone-500 text-[10px]">Then specify <span className="text-stone-300">~/.codex-work</span> in the box above.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block font-mono text-[10px] tracking-wider uppercase font-semibold text-stone-400 mb-1.5">
                    Profile Directory
                  </label>
                  <input
                    type="text"
                    placeholder="default (or ~/.agy-work)"
                    value={authProfileId}
                    onChange={(e) => setAuthProfileId(e.target.value)}
                    className="w-full bg-[#0c1020] border border-blue-950/50 rounded-2xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-blue-500/50 font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-[#111828]/80 border border-blue-900/30 text-[11px] font-mono text-stone-400 space-y-1.5">
                  <div className="font-semibold text-blue-400 text-xs">To authenticate a second Google account:</div>
                  <code className="block bg-[#090e18] px-2.5 py-1.5 rounded-xl text-blue-300 font-mono text-[10px] select-all border border-blue-950/40">
                    HOME=~/.agy-work agy
                  </code>
                  <p className="text-stone-500 text-[10px]">Then specify <span className="text-stone-300">~/.agy-work</span> in the box above.</p>
                </div>
              </div>
            )}

            {/* Test Connection */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full py-2.5 px-3 rounded-2xl text-xs font-mono text-stone-300 bg-[#101828] hover:bg-[#121c34] border border-blue-900/30 flex items-center justify-center gap-2 transition-colors"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    Testing connection...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>

              {testResult && (
                <div
                  className={`mt-3 p-3 rounded-2xl text-xs font-mono border flex items-start gap-2.5 ${
                    testResult.success
                      ? "bg-blue-950/20 border-blue-500/30 text-blue-300"
                      : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testResult.message}</div>
                    {testResult.email && (
                      <div className="text-[11px] text-blue-400/80 mt-0.5">
                        email: {testResult.email}
                      </div>
                    )}
                    {testResult.plan && (
                      <div className="text-[11px] text-blue-400/80 mt-0.5">
                        plan: {testResult.plan}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 px-6 border-t border-blue-950/40 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-mono text-stone-400 hover:text-stone-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:pointer-events-none transition-all shadow-md font-sans"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
