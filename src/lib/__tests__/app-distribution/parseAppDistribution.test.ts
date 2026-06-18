import {
  getConfiguredAppDistribution,
  parseAppDistribution,
  supportsRemoteUpdateChecks,
} from "@/lib/app-distribution";

describe("parseAppDistribution", () => {
  it("accepts supported distribution values", () => {
    expect(parseAppDistribution("itch")).toBe("itch");
    expect(parseAppDistribution("download")).toBe("download");
    expect(parseAppDistribution("npm")).toBe("npm");
  });

  it("returns unknown for invalid or missing values", () => {
    expect(parseAppDistribution(undefined)).toBe("unknown");
    expect(parseAppDistribution(null)).toBe("unknown");
    expect(parseAppDistribution("local")).toBe("unknown");
    expect(parseAppDistribution("")).toBe("unknown");
  });

  it("reads the configured distribution from NEXT_PUBLIC_APP_DISTRIBUTION", () => {
    const original = process.env.NEXT_PUBLIC_APP_DISTRIBUTION;
    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = "download";

    expect(getConfiguredAppDistribution()).toBe("download");

    process.env.NEXT_PUBLIC_APP_DISTRIBUTION = original;
  });

  it("identifies channels that should perform remote update checks", () => {
    expect(supportsRemoteUpdateChecks("download")).toBe(true);
    expect(supportsRemoteUpdateChecks("npm")).toBe(true);
    expect(supportsRemoteUpdateChecks("itch")).toBe(false);
    expect(supportsRemoteUpdateChecks("unknown")).toBe(false);
  });
});
