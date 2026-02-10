import { NextRequest, NextResponse } from "next/server";
import { readLocalSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normBase(url: string) {
  return url.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const stored = await readLocalSettings();
    const body = await req.json().catch(() => ({}));

    const gatewayUrl = typeof body.gatewayUrl === "string" ? body.gatewayUrl : stored.gatewayUrl;
    const gatewayToken =
      typeof body.gatewayToken === "string"
        ? body.gatewayToken
        : stored.gatewayToken;

    if (!gatewayUrl) {
      return NextResponse.json(
        { success: false, error: "Missing gatewayUrl" },
        { status: 400 }
      );
    }

    const base = normBase(gatewayUrl);
    const candidates = ["/health", "/api/health", "/status", "/api/status", "/"]; // best-effort

    const headers: Record<string, string> = {};
    if (gatewayToken) headers["Authorization"] = `Bearer ${gatewayToken}`;

    const errors: any[] = [];

    for (const p of candidates) {
      const url = base + p;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers,
          // avoid hanging forever
          cache: "no-store",
        });

        const text = await res.text().catch(() => "");

        if (res.ok) {
          return NextResponse.json({
            success: true,
            ok: true,
            url,
            status: res.status,
            bodyPreview: text.slice(0, 500),
          });
        }

        errors.push({ url, status: res.status, bodyPreview: text.slice(0, 200) });
      } catch (e: any) {
        errors.push({ url, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({
      success: true,
      ok: false,
      tried: errors,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Test failed" },
      { status: 500 }
    );
  }
}
