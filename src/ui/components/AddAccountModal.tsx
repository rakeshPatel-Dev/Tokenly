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
  const [isSaving, setIsSaving] = useState(false);
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
            message: `Connected — found ${res.windows.length} ${res.windows.length === 1 ? "limit" : "limits"}.`,
            email: res.email,
          });
        } else {
          setTestResult({
            tested: true,
            success: false,
            message: res.error || "Could not reach the Antigravity CLI.",
          });
        }
      } else {
        const res = await api.queryCodex(profilePath);
        if (res.success && res.authenticated) {
          setTestResult({
            tested: true,
            success: true,
            message: `Connected — found ${res.windows.length} ${res.windows.length === 1 ? "limit" : "limits"}.`,
            email: res.email,
            plan: res.plan_type,
          });
        } else {
          setTestResult({
            tested: true,
            success: false,
            message: res.error || "Codex is not running or signed in.",
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profile = authProfileId.trim() || (provider === "codex" ? "~/.codex" : "default");
      const id = `${provider}-${Date.now()}`;
      const now = new Date().toISOString();

      const newAccount: Account = {
        id,
        provider,
        displayName: displayName.trim() || (provider === "codex" ? "Codex" : "Antigravity"),
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
        // Handled downstream
      }

      onAdded(newAccount);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--t-scrim)] p-4">
      <div className="panel-modal w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--t-line)] px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--t-ink)]">
              <Plus className="h-4 w-4" />
              Add an account
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--t-ink-5)]">
              Track credits from a local Codex or Antigravity profile.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* Provider */}
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[var(--t-ink-5)]">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setProvider("antigravity");
                  setTestResult(null);
                }}
                className={`flex items-start gap-3 border p-3.5 text-left transition-colors duration-150 ${
                  provider === "antigravity"
                    ? "border-[var(--t-ink-2)] bg-[var(--t-raised)]"
                    : "border-[var(--t-line-2)] bg-[var(--t-surface-2)] hover:border-[var(--t-line-hover)]"
                }`}
              >
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-[var(--t-ink-2)]" />
                <div>
                  <div className="text-[13px] font-medium text-[var(--t-ink)]">Antigravity</div>
                  <div className="mt-0.5 text-[11px] text-[var(--t-ink-5)]">Google CLI</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProvider("codex");
                  setTestResult(null);
                }}
                className={`flex items-start gap-3 border p-3.5 text-left transition-colors duration-150 ${
                  provider === "codex"
                    ? "border-[var(--t-ink-2)] bg-[var(--t-raised)]"
                    : "border-[var(--t-line-2)] bg-[var(--t-surface-2)] hover:border-[var(--t-line-hover)]"
                }`}
              >
                <Server className="mt-0.5 h-4 w-4 shrink-0 text-[var(--t-ink-2)]" />
                <div>
                  <div className="text-[13px] font-medium text-[var(--t-ink)]">Codex</div>
                  <div className="mt-0.5 text-[11px] text-[var(--t-ink-5)]">OpenAI CLI</div>
                </div>
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--t-ink-5)]">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Work, school"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input px-3 py-2 text-[12.5px]"
            />
          </div>

          {/* Profile folder */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-[var(--t-ink-5)]">
              Profile folder
            </label>
            <input
              type="text"
              placeholder={provider === "codex" ? "~/.codex" : "default"}
              value={authProfileId}
              onChange={(e) => { setAuthProfileId(e.target.value); setTestResult(null); }}
              className="input px-3 py-2 font-mono text-[12.5px]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--t-ink-8)]">
              Leave blank for the default profile. To add another account, log it
              into a separate directory first, then enter that path here.
            </p>
          </div>

          {/* Setup hint */}
          <div className="panel-well space-y-1.5 px-3.5 py-3 text-[11.5px] text-[var(--t-ink-5)]">
            {provider === "codex" ? (
              <>
                <div className="font-medium text-[var(--t-ink-2)]">Add another Codex account?</div>
                <code className="block select-all border border-[var(--t-line)] bg-[var(--t-bg)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--t-ink-2)]">
                  CODEX_HOME=~/.codex-work codex login
                </code>
                <p>Then enter <span className="text-[var(--t-ink-2)]">~/.codex-work</span> as the folder.</p>
              </>
            ) : (
              <>
                <div className="font-medium text-[var(--t-ink-2)]">Add another Google account?</div>
                <code className="block select-all border border-[var(--t-line)] bg-[var(--t-bg)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--t-ink-2)]">
                  HOME=~/.agy-work agy
                </code>
                <p>Then enter <span className="text-[var(--t-ink-2)]">~/.agy-work</span> as the folder.</p>
              </>
            )}
          </div>

          {/* Test connection */}
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="btn btn-amber w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking…
                </>
              ) : (
                "Check connection"
              )}
            </button>

            {testResult && (
              <div
                className={`mt-3 flex items-start gap-2.5 border px-3.5 py-3 text-[12px] ${
                  testResult.success
                    ? "border-[rgba(52,211,153,0.4)] bg-[var(--t-green-well)] text-[var(--t-ink-2)]"
                    : "border-[rgba(239,68,68,0.4)] bg-[var(--t-red-well)] text-[var(--t-ink-2)]"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--t-green)]" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--t-red-bright)]" />
                )}
                <div>
                  <div className="font-medium">{testResult.message}</div>
                  {testResult.email && (
                    <div className="mt-0.5 text-[11px] text-[var(--t-ink-5)]">
                      Signed in as {testResult.email}
                    </div>
                  )}
                  {testResult.plan && (
                    <div className="text-[11px] text-[var(--t-ink-5)]">
                      Plan: {testResult.plan}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[var(--t-line)] px-6 py-4">
          <button onClick={onClose} disabled={isSaving} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !testResult?.success}
            className="btn btn-primary"
            title={!testResult?.success ? 'Run "Check connection" first' : undefined}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};