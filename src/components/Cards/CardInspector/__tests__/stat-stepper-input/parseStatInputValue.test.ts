import { parseStatInputValue } from "@/components/Cards/CardInspector/stat-stepper-input";

const rules = { min: 0, max: 100, allowWildcard: true };

describe("parseStatInputValue", () => {
  it.each([
    ["", null],
    ["*", -1],
    ["1*", null],
    ["abc", null],
    ["1000", null],
    ["01", null],
    ["101", null],
    ["42", 42],
  ])("parses %s as %s", (text, expected) => {
    expect(parseStatInputValue(text, rules)).toBe(expected);
  });

  it("enforces wildcard and minimum rules", () => {
    expect(parseStatInputValue("*", { ...rules, allowWildcard: false })).toBeNull();
    expect(parseStatInputValue("4", { ...rules, min: 5 })).toBeNull();
  });
});
