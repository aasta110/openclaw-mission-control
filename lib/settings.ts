import { promises as fs } from "fs";
import path from "path";

export type LocalSettings = {
  gatewayUrl?: string;
  gatewayToken?: string;
  clawbotWsUrl?: string;
};

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.local.json");

export async function readLocalSettings(): Promise<LocalSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const s: LocalSettings = {};
    if (typeof parsed.gatewayUrl === "string") s.gatewayUrl = parsed.gatewayUrl;
    if (typeof parsed.gatewayToken === "string") s.gatewayToken = parsed.gatewayToken;
    if (typeof parsed.clawbotWsUrl === "string") s.clawbotWsUrl = parsed.clawbotWsUrl;
    return s;
  } catch {
    return {};
  }
}

export async function writeLocalSettings(patch: LocalSettings): Promise<LocalSettings> {
  const current = await readLocalSettings();
  const next: LocalSettings = {
    ...current,
    ...patch,
  };

  // Normalize empty strings to undefined
  for (const k of Object.keys(next) as (keyof LocalSettings)[]) {
    const v = next[k];
    if (typeof v === "string" && v.trim() === "") delete next[k];
  }

  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");
  return next;
}

export function maskSecret(secret?: string) {
  if (!secret) return "";
  if (secret.length <= 6) return "•".repeat(secret.length);
  return `${secret.slice(0, 2)}${"•".repeat(Math.min(12, secret.length - 4))}${secret.slice(-2)}`;
}
