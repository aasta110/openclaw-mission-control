"use client";

import { useEffect, useMemo, useState } from "react";

type SettingsResponse = {
  success: boolean;
  settings?: {
    gatewayUrl: string;
    clawbotWsUrl: string;
    gatewayTokenMasked: string;
    hasGatewayToken: boolean;
  };
  error?: string;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [gatewayUrl, setGatewayUrl] = useState("");
  const [clawbotWsUrl, setClawbotWsUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [tokenMasked, setTokenMasked] = useState("");
  const [revealToken, setRevealToken] = useState(false);

  const tokenPlaceholder = useMemo(() => {
    if (gatewayToken) return "";
    if (hasStoredToken) return tokenMasked || "(saved)";
    return "";
  }, [gatewayToken, hasStoredToken, tokenMasked]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data: SettingsResponse = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load settings");

      setGatewayUrl(data.settings?.gatewayUrl || "");
      setClawbotWsUrl(data.settings?.clawbotWsUrl || "");
      setHasStoredToken(Boolean(data.settings?.hasGatewayToken));
      setTokenMasked(data.settings?.gatewayTokenMasked || "");
      setGatewayToken(""); // never preload secret into input
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const payload: any = {
        gatewayUrl,
        clawbotWsUrl,
      };

      // Only send token if user typed something
      if (gatewayToken.trim() !== "") payload.gatewayToken = gatewayToken;

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: SettingsResponse = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save settings");

      setHasStoredToken(Boolean(data.settings?.hasGatewayToken));
      setTokenMasked(data.settings?.gatewayTokenMasked || "");
      setGatewayToken("");
      setNotice("Saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gatewayUrl,
          gatewayToken: gatewayToken.trim() !== "" ? gatewayToken : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Test failed");
      if (data.ok) setNotice(`Gateway reachable: ${data.url} (HTTP ${data.status})`);
      else setError("Gateway not reachable (see console for details)");
      if (!data.ok) console.log("Gateway test details:", data);
    } catch (e: any) {
      setError(e?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-10">
        <div className="max-w-3xl mx-auto pt-6">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="font-display text-2xl text-text-primary tracking-wide">Settings</h1>
              <p className="font-body text-sm text-text-muted mt-1">
                Local-only config for Mission Control / Clawbot integrations.
              </p>
            </div>
          </div>

          {(error || notice) && (
            <div className="mt-6">
              {error && (
                <div className="rounded-2xl bg-danger/10 border border-danger/30 p-4">
                  <div className="font-body text-sm text-text-secondary">{error}</div>
                </div>
              )}
              {notice && (
                <div className="rounded-2xl bg-success/10 border border-success/30 p-4 mt-3">
                  <div className="font-body text-sm text-text-secondary">{notice}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 glass-card" />
            <div className="absolute inset-0 rounded-3xl border border-white/10" />

            <div className="relative p-6 space-y-5">
              <div>
                <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-wider mb-2">
                  OpenClaw Gateway URL
                </label>
                <input
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="http://localhost:4242"
                  className="w-full rounded-2xl bg-white/2 border border-white/15 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-muted/70 outline-none focus:border-white/35 focus:bg-white/3"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-wider mb-2">
                  OpenClaw Gateway Token
                </label>
                <div className="flex gap-3">
                  <input
                    value={gatewayToken}
                    onChange={(e) => setGatewayToken(e.target.value)}
                    placeholder={tokenPlaceholder}
                    type={revealToken ? "text" : "password"}
                    className="flex-1 rounded-2xl bg-white/2 border border-white/15 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-muted/70 outline-none focus:border-white/35 focus:bg-white/3"
                    disabled={loading}
                  />
                  <button
                    onClick={() => setRevealToken((v) => !v)}
                    className="px-4 py-3 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors font-body text-xs text-text-secondary"
                    type="button">
                    {revealToken ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => {
                      const v = gatewayToken || "";
                      if (v) navigator.clipboard.writeText(v);
                    }}
                    className="px-4 py-3 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors font-body text-xs text-text-secondary"
                    type="button">
                    Copy
                  </button>
                </div>
                <p className="font-body text-xs text-text-muted/90 mt-2">
                  Token is stored locally in <code className="font-mono text-text-secondary">data/settings.local.json</code> and is gitignored.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-text-secondary uppercase tracking-wider mb-2">
                  Clawbot WebSocket URL
                </label>
                <input
                  value={clawbotWsUrl}
                  onChange={(e) => setClawbotWsUrl(e.target.value)}
                  placeholder="wss://your-clawbot.example/ws"
                  className="w-full rounded-2xl bg-white/2 border border-white/15 px-4 py-3 font-body text-sm text-text-primary placeholder:text-text-muted/70 outline-none focus:border-white/35 focus:bg-white/3"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={save}
                  disabled={loading || saving}
                  className="px-5 py-3 rounded-2xl btn-glow text-void font-display text-sm tracking-wide disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  onClick={test}
                  disabled={loading || testing}
                  className="px-5 py-3 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors text-text-primary font-display text-sm tracking-wide disabled:opacity-60">
                  {testing ? "Testing…" : "Test gateway"}
                </button>

                <button
                  onClick={load}
                  disabled={loading}
                  className="ml-auto px-4 py-3 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors font-body text-xs text-text-secondary disabled:opacity-60"
                  type="button">
                  Reload
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/4 border border-white/10 p-4">
            <p className="font-body text-xs text-text-muted">
              Next step (optional): use these settings to power the Activity feed via the gateway/websocket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
