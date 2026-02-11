import { readLocalSettings } from './settings';

// Server-side helper for invoking OpenClaw tools via Gateway HTTP API.
// This keeps tokens off the client: the browser only calls our Next.js API.

type InvokeBody = {
  tool: string;
  action?: string;
  args?: Record<string, unknown>;
  sessionKey?: string;
  dryRun?: boolean;
};

function normBase(url: string) {
  return url.replace(/\/+$/, '');
}

export async function gatewayInvoke<T = any>(body: InvokeBody): Promise<{ ok: true; result: T } | { ok: false; error: string; status?: number; detail?: any }> {
  const s = await readLocalSettings();
  const gatewayUrl = s.gatewayUrl;
  const token = s.gatewayToken;

  if (!gatewayUrl) {
    return { ok: false, error: 'OpenClaw Gateway is not configured (missing gatewayUrl)' };
  }

  const url = normBase(gatewayUrl) + '/tools/invoke';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { _nonJson: text };
    }

    if (!res.ok) {
      return { ok: false, error: 'Gateway invoke failed', status: res.status, detail: json };
    }

    if (json && json.ok) {
      return { ok: true, result: json.result as T };
    }

    return { ok: false, error: 'Gateway invoke returned non-ok', status: res.status, detail: json };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
