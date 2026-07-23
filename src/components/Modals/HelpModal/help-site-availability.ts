export const HELP_SITE_URL = "https://markforster.github.io/heroquest-card-creator/help/";
export const HELP_SITE_TIMEOUT_MS = 4000;

type CheckHelpSiteAvailabilityOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  url?: string;
};

export async function checkHelpSiteAvailability({
  fetchImpl = fetch,
  timeoutMs = HELP_SITE_TIMEOUT_MS,
  url = HELP_SITE_URL,
}: CheckHelpSiteAvailabilityOptions = {}): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      method: "HEAD",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
