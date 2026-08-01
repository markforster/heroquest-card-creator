import { formatStatInputValue } from "@/components/Cards/CardInspector/stat-stepper-input";

describe("formatStatInputValue", () => {
  it("formats wildcard and numeric values", () => {
    expect(formatStatInputValue(-1)).toBe("*");
    expect(formatStatInputValue(12)).toBe("12");
  });
});
