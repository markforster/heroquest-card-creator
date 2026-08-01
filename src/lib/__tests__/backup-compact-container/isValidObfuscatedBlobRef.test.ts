import {
  buildObfuscatedBlobRef,
  isValidObfuscatedBlobRef,
} from "@/lib/backup/backup-compact-container";

describe("isValidObfuscatedBlobRef", () => {
  it("accepts only the exact reference for the supplied type and identifier", () => {
    const ref = buildObfuscatedBlobRef("asset", "asset-123");

    expect(isValidObfuscatedBlobRef("asset", "asset-123", ref)).toBe(true);
    expect(isValidObfuscatedBlobRef("thumb", "asset-123", ref)).toBe(false);
    expect(isValidObfuscatedBlobRef("asset", "asset-123", "other/value")).toBe(false);
  });
});
