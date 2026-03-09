export type AnalyticsContextData = {
  app_distribution: "itch" | "local" | "self_hosted" | "unknown" | "npm";
  app_version: string;
  app_host: string;
  app_url?: string;
};

type LocationLike = {
  protocol?: string | null;
  hostname?: string | null;
  origin?: string | null;
  pathname?: string | null;
  href?: string | null;
};

export function buildAnalyticsContext(
  location: LocationLike | null | undefined,
  appVersion: string,
): AnalyticsContextData {
  const override = sanitizeOverride(process.env.NEXT_PUBLIC_APP_DISTRIBUTION);
  const protocol = location?.protocol ?? "";
  const hostname = location?.hostname ?? "";
  const isFile = protocol === "file:";

  let distribution: AnalyticsContextData["app_distribution"] = "unknown";
  if (override) {
    distribution = override;
  } else if (isFile) {
    distribution = "local";
  } else if (hostname.includes("itch.io")) {
    distribution = "itch";
  } else if (hostname) {
    distribution = "self_hosted";
  }

  const appHost = isFile ? "local" : hostname || "unknown";
  const appUrl = isFile ? undefined : resolveAppUrl(location);

  return {
    app_distribution: distribution,
    app_version: appVersion,
    app_host: appHost,
    app_url: appUrl,
  };
}

function resolveAppUrl(location: LocationLike | null | undefined): string | undefined {
  if (!location) return undefined;
  const origin = location.origin ?? "";
  const pathname = location.pathname ?? "";
  if (origin || pathname) {
    return `${origin}${pathname}`;
  }
  const href = location.href ?? "";
  if (!href) return undefined;
  try {
    const parsed = new URL(href);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return undefined;
  }
}

function sanitizeOverride(value: string | undefined): AnalyticsContextData["app_distribution"] | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const allowed: AnalyticsContextData["app_distribution"][] = [
    "itch",
    "local",
    "self_hosted",
    "unknown",
    "npm",
  ];
  if (allowed.includes(trimmed as AnalyticsContextData["app_distribution"])) {
    return trimmed as AnalyticsContextData["app_distribution"];
  }
  return null;
}
