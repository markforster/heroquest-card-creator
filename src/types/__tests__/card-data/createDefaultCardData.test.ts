import { DEFAULT_BODY_TEXT_COLOR } from "@/config/colors";
import { createDefaultCardData } from "@/types/card-data";

describe("createDefaultCardData", () => {
  it("returns hero defaults", () => {
    expect(createDefaultCardData("hero")).toEqual({
      bodyTextColor: DEFAULT_BODY_TEXT_COLOR,
      attackDice: 3,
      defendDice: 2,
      bodyPoints: 8,
      mindPoints: 2,
    });
  });

  it("returns empty object for monster by default", () => {
    expect(createDefaultCardData("monster")).toEqual({ bodyTextColor: DEFAULT_BODY_TEXT_COLOR });
  });

  it("returns empty object for large-treasure by default", () => {
    expect(createDefaultCardData("large-treasure")).toEqual({ bodyTextColor: DEFAULT_BODY_TEXT_COLOR });
  });

  it("returns empty object for small-treasure by default", () => {
    expect(createDefaultCardData("small-treasure")).toEqual({ bodyTextColor: DEFAULT_BODY_TEXT_COLOR });
  });

  it("returns empty object for hero-back by default", () => {
    expect(createDefaultCardData("hero-back")).toEqual({ bodyTextColor: DEFAULT_BODY_TEXT_COLOR });
  });

  it("returns empty object for labelled-back by default", () => {
    expect(createDefaultCardData("labelled-back")).toEqual({
      bodyTextColor: DEFAULT_BODY_TEXT_COLOR,
      titlePlacement: "bottom",
      titleStyle: "ribbon",
    });
  });

  it("returns empty object for unknown template ids (runtime safety)", () => {
    expect(createDefaultCardData("unknown-template" as unknown as "hero")).toEqual({
      bodyTextColor: DEFAULT_BODY_TEXT_COLOR,
    });
  });
});
