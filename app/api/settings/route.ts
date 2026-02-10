import { NextRequest, NextResponse } from "next/server";
import { maskSecret, readLocalSettings, writeLocalSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readLocalSettings();
  return NextResponse.json({
    success: true,
    settings: {
      gatewayUrl: s.gatewayUrl || "",
      clawbotWsUrl: s.clawbotWsUrl || "",
      gatewayTokenMasked: s.gatewayToken ? maskSecret(s.gatewayToken) : "",
      hasGatewayToken: Boolean(s.gatewayToken),
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    const patch: any = {};
    if (typeof body.gatewayUrl === "string") patch.gatewayUrl = body.gatewayUrl;
    if (typeof body.clawbotWsUrl === "string") patch.clawbotWsUrl = body.clawbotWsUrl;

    // Only update token if client explicitly sends it (avoid wiping by accident)
    if (Object.prototype.hasOwnProperty.call(body, "gatewayToken")) {
      if (typeof body.gatewayToken === "string") patch.gatewayToken = body.gatewayToken;
    }

    const s = await writeLocalSettings(patch);

    return NextResponse.json({
      success: true,
      settings: {
        gatewayUrl: s.gatewayUrl || "",
        clawbotWsUrl: s.clawbotWsUrl || "",
        gatewayTokenMasked: s.gatewayToken ? maskSecret(s.gatewayToken) : "",
        hasGatewayToken: Boolean(s.gatewayToken),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
