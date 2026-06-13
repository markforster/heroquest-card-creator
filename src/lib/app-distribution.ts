export type AppDistribution = "itch" | "download" | "npm" | "unknown";

export function parseAppDistribution(value: string | null | undefined): AppDistribution {
  if (!value) return "unknown";
  const trimmed = value.trim();
  if (trimmed === "itch" || trimmed === "download" || trimmed === "npm") {
    return trimmed;
  }
  if (trimmed === "unknown") {
    return "unknown";
  }
  return "unknown";
}

export function getConfiguredAppDistribution(
  value: string | null | undefined = process.env.NEXT_PUBLIC_APP_DISTRIBUTION,
): AppDistribution {
  return parseAppDistribution(value);
}

export function supportsRemoteUpdateChecks(distribution: AppDistribution): boolean {
  return distribution === "download" || distribution === "npm";
}
