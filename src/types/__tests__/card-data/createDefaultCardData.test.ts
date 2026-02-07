import { createDefaultCardData } from "@/types/card-data";

describe("createDefaultCardData", () => {
  it("returns hero defaults", () => {
    expect(createDefaultCardData("hero")).toEqual({
      attackDice: 3,
      defendDice: 2,
      bodyPoints: 8,
      mindPoints: 2,
    });
  });

  it("returns empty object for monster by default", () => {
    expect(createDefaultCardData("monster")).toEqual({});
  });

  it("returns empty object for large-treasure by default", () => {
    expect(createDefaultCardData("large-treasure")).toEqual({});
  });

  it("returns empty object for small-treasure by default", () => {
    expect(createDefaultCardData("small-treasure")).toEqual({});
  });

  it("returns empty object for hero-back by default", () => {
    expect(createDefaultCardData("hero-back")).toEqual({});
  });

  it("returns empty object for labelled-back by default", () => {
    expect(createDefaultCardData("labelled-back")).toEqual({});
  });

  it("returns empty object for unknown template ids (runtime safety)", () => {
    expect(createDefaultCardData("unknown-template" as unknown as "hero")).toEqual({});
  });
});
