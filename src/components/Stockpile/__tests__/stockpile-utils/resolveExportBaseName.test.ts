import { resolveExportBaseName } from "@/components/Stockpile/stockpile-utils";

describe("resolveExportBaseName", () => {
  it("normalizes names to a safe lowercase slug", () => {
    const result = resolveExportBaseName("  My File!.PNG ");
    expect(result).toBe("my-file.png");
  });

  it("falls back to card when empty", () => {
    expect(resolveExportBaseName("   ")).toBe("card");
    expect(resolveExportBaseName()).toBe("card");
  });
});
