export const DEFAULT_HELP_SITE_URL = "https://heroquestcards.done-well.co.uk/help/";

export function resolveHelpSiteUrl(configuredUrl = process.env.NEXT_PUBLIC_HELP_SITE_URL): string {
  return configuredUrl?.trim() || DEFAULT_HELP_SITE_URL;
}

export const HELP_SITE_URL = resolveHelpSiteUrl();
export const HELP_SITE_TIMEOUT_MS = 4000;

type CheckHelpSiteAvailabilityOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  url?: string;
};

function isLoopbackUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export async function checkHelpSiteAvailability({
  fetchImpl = fetch,
  timeoutMs = HELP_SITE_TIMEOUT_MS,
  url = HELP_SITE_URL,
}: CheckHelpSiteAvailabilityOptions = {}): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const isLoopback = isLoopbackUrl(url);

  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      method: "HEAD",
      ...(isLoopback ? { mode: "no-cors" as const } : {}),
      signal: controller.signal,
    });
    return response.ok || (isLoopback && response.type === "opaque");
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
