import { normalizeHexValue } from "@/components/Cards/CardInspector/card-inspector-color-utils";

describe("normalizeHexValue", () => {
  it.each([
    [undefined, null],
    ["invalid", null],
    ["#abc", "#AABBCC"],
    ["#11223380", "#11223380"],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeHexValue(value)).toBe(expected);
  });
});
