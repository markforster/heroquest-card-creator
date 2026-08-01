import { resolveCopyrightTextStyle } from "@/components/Cards/CardPreview/cardPreviewCopyright";
import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";

describe("resolveCopyrightTextStyle", () => {
  it("returns safe defaults without a template", () => {
    expect(resolveCopyrightTextStyle()).toEqual({
      fontSize: 16,
      fontWeight: undefined,
      fontFamily: "Helvetica, Arial, sans-serif",
      letterSpacingEm: undefined,
      fill: DEFAULT_COPYRIGHT_COLOR,
    });
  });

  it("resolves configured copyright layer typography", () => {
    expect(resolveCopyrightTextStyle("hero")).toEqual(
      expect.objectContaining({
        fontSize: expect.any(Number),
        fontFamily: expect.any(String),
        fill: expect.any(String),
      }),
    );
  });
});
