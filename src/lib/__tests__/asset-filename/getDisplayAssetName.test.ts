import { getDisplayAssetName } from "@/lib/asset-filename";

describe("getDisplayAssetName", () => {
  it("removes supported image extensions for display", () => {
    expect(getDisplayAssetName("goblin.png")).toBe("goblin");
    expect(getDisplayAssetName("goblin.jpg")).toBe("goblin");
    expect(getDisplayAssetName("goblin.jpeg")).toBe("goblin");
    expect(getDisplayAssetName("goblin.webp")).toBe("goblin");
  });

  it("matches supported image extensions case-insensitively", () => {
    expect(getDisplayAssetName("goblin.PNG")).toBe("goblin");
    expect(getDisplayAssetName("goblin.JpEg")).toBe("goblin");
  });

  it("preserves non-image filenames", () => {
    expect(getDisplayAssetName("goblin")).toBe("goblin");
    expect(getDisplayAssetName("goblin.backup.psd")).toBe("goblin.backup.psd");
  });
});
