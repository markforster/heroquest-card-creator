import { buildObfuscatedBlobRef } from "@/lib/backup/backup-compact-container";

describe("buildObfuscatedBlobRef", () => {
  it("builds deterministic, type-specific references containing the original identifier", () => {
    expect(buildObfuscatedBlobRef("asset", "asset-123")).toMatch(/^blobs\/[0-9a-f]{6}-asset-123$/);
    expect(buildObfuscatedBlobRef("asset", "asset-123")).not.toBe(
      buildObfuscatedBlobRef("thumb", "asset-123"),
    );
  });
});
