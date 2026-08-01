import {
  getDefaultTextFittingPreferences,
  getTextFittingPreferences,
  mergeTextFittingPreferences,
  storeTextFittingPreferences,
} from "@/lib/text-fitting/preferences";

describe("text fitting preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("returns role defaults when no stored preferences exist", () => {
    expect(getTextFittingPreferences("title")).toEqual(getDefaultTextFittingPreferences("title"));
    expect(getTextFittingPreferences("statHeading")).toEqual(
      getDefaultTextFittingPreferences("statHeading"),
    );
  });

  it("loads valid title preferences and clamps numeric values", () => {
    window.localStorage.setItem(
      "hqcc.titleFittingPrefs",
      JSON.stringify({
        allowWrap: true,
        minFontPercent: 10,
        twoLineMinPercent: 120,
        allowOverflow: true,
        preferEllipsis: true,
        ignored: "value",
      }),
    );

    expect(getTextFittingPreferences("title")).toEqual({
      allowWrap: true,
      minFontPercent: 50,
      twoLineMinPercent: 100,
      allowOverflow: true,
      preferEllipsis: true,
    });
  });

  it("loads valid stat heading preferences and ignores invalid values", () => {
    window.localStorage.setItem(
      "hqcc.statHeadingFittingPrefs",
      JSON.stringify({
        minFontPercent: 80,
        allowOverflow: "yes",
        forceTwoLine: false,
        preferEllipsis: true,
      }),
    );

    expect(getTextFittingPreferences("statHeading")).toEqual({
      minFontPercent: 80,
      allowOverflow: false,
      forceTwoLine: false,
      preferEllipsis: true,
    });
  });

  it("falls back to defaults when stored JSON is invalid", () => {
    window.localStorage.setItem("hqcc.titleFittingPrefs", "not-json");

    expect(getTextFittingPreferences("title")).toEqual(getDefaultTextFittingPreferences("title"));
  });

  it("merges and sanitizes role updates", () => {
    expect(
      mergeTextFittingPreferences(
        "title",
        { minFontPercent: 75, allowWrap: false },
        { minFontPercent: Number.NaN, allowWrap: true },
      ),
    ).toEqual({ minFontPercent: 50, allowWrap: true });

    expect(
      mergeTextFittingPreferences(
        "statHeading",
        { minFontPercent: 95, forceTwoLine: true },
        { minFontPercent: 110, forceTwoLine: false },
      ),
    ).toEqual({ minFontPercent: 100, forceTwoLine: false });
  });

  it("stores preferences and tolerates storage failures", () => {
    storeTextFittingPreferences("title", { minFontPercent: 80 });
    expect(window.localStorage.getItem("hqcc.titleFittingPrefs")).toBe(
      JSON.stringify({ minFontPercent: 80 }),
    );

    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => storeTextFittingPreferences("title", { minFontPercent: 70 })).not.toThrow();
  });
});
