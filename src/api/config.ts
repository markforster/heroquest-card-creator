"use client";

type ApiMode = "local" | "remote";

type ApiConfig = {
  mode: ApiMode;
  baseUrl: string | null;
  authToken: string | null;
};

function normalizeMode(value?: string | null): ApiMode {
  if (!value) return "local";
  const normalized = value.trim().toLowerCase();
  return normalized === "remote" ? "remote" : "local";
}

function normalizeString(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function readApiConfig(): ApiConfig {
  const mode = normalizeMode(process.env.NEXT_PUBLIC_API_MODE);
  const baseUrl = normalizeString(process.env.NEXT_PUBLIC_API_BASE_URL);
  const authToken = normalizeString(process.env.NEXT_PUBLIC_API_AUTH_TOKEN);

  if (mode === "remote" && !baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required when NEXT_PUBLIC_API_MODE=remote");
  }

  return {
    mode,
    baseUrl,
    authToken,
  };
}
