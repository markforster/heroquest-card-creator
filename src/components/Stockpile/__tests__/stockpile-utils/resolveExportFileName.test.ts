import { resolveExportFileName } from "@/components/Stockpile/stockpile-utils";

describe("resolveExportFileName", () => {
  it("generates unique file names with .png extension", () => {
    const used = new Map<string, number>();
    const first = resolveExportFileName("Test Name", used);
    const second = resolveExportFileName("Test Name", used);
    const third = resolveExportFileName("Test Name.png", used);

    expect(first).toBe("test-name.png");
    expect(second).toBe("test-name-2.png");
    expect(third).toBe("test-name-3.png");
  });

  it("preserves existing extensions", () => {
    const used = new Map<string, number>();
    const name = resolveExportFileName("example.png", used);
    expect(name).toBe("example.png");
  });
});
