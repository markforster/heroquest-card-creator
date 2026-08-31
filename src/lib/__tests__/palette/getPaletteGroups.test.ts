const extractPaletteFromCanvas = jest.fn();

jest.mock("@/lib/color-palette", () => ({
  extractPaletteFromCanvas: (...args: unknown[]) => extractPaletteFromCanvas(...args),
}));

import { getPalette, getPaletteGroups } from "@/lib/palette";

describe("palette helpers", () => {
  beforeEach(() => {
    extractPaletteFromCanvas.mockReset();
  });

  it("extracts a palette directly from an existing canvas", async () => {
    const canvas = document.createElement("canvas");
    extractPaletteFromCanvas.mockReturnValue(["#112233"]);

    await expect(getPalette(canvas, { maxColors: 3 })).resolves.toEqual(["#112233"]);
    expect(extractPaletteFromCanvas).toHaveBeenCalledWith(canvas, { maxColors: 3 });
  });

  it("returns no palette for an image without usable dimensions", async () => {
    const image = document.createElement("img");

    await expect(getPalette(image)).resolves.toEqual([]);
    expect(extractPaletteFromCanvas).not.toHaveBeenCalled();
  });

  it("returns no groups when no base colors are available", async () => {
    extractPaletteFromCanvas.mockReturnValue([]);

    await expect(getPaletteGroups(document.createElement("canvas"))).resolves.toEqual([]);
  });

  it("organizes colors by mood and creates complementary suggestions", async () => {
    extractPaletteFromCanvas.mockReturnValue([
      "#FF0000",
      "#804000",
      "#202020",
      "#F5F5F5",
      "#00FF00",
    ]);

    const groups = await getPaletteGroups(document.createElement("canvas"));

    expect(groups).toEqual(
      expect.arrayContaining([
        { id: "dominant", colors: ["#FF0000", "#804000", "#202020", "#F5F5F5"] },
        { id: "vibrant", colors: expect.arrayContaining(["#FF0000", "#00FF00"]) },
        { id: "dark", colors: ["#804000", "#202020"] },
        { id: "light", colors: ["#F5F5F5"] },
        { id: "complementary", colors: expect.any(Array) },
      ]),
    );
    expect(groups.find((group) => group.id === "complementary")?.colors).not.toHaveLength(0);
  });
});
