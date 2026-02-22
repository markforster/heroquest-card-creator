"use client";

function parseEnvFlag(value?: string): boolean | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function isDebugToolsEnabled(): boolean {
  const envValue = parseEnvFlag(process.env.NEXT_PUBLIC_DEBUG_TOOLS);
  if (envValue != null) return envValue;
  return process.env.NODE_ENV !== "production";
}
