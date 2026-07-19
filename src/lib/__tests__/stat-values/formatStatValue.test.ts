import { formatStatValue } from "@/lib/stat-values";

describe("formatStatValue", () => {
  it("formats single numbers as strings", () => {
    expect(formatStatValue(7)).toBe("7");
  });

  it("formats single numbers with asterisk suffixes", () => {
    expect(formatStatValue(7, [true])).toBe("7*");
  });

  it("formats -1 as wildcard", () => {
    expect(formatStatValue(-1)).toBe("*");
  });

  it("formats split values with / separator", () => {
    expect(formatStatValue([3, 5])).toBe("3/5");
  });

  it("formats wildcard inside split values", () => {
    expect(formatStatValue([2, -1])).toBe("2/*");
  });

  it("formats split values with per-side asterisk suffixes", () => {
    expect(formatStatValue([2, 5, 1], [true, true])).toBe("2*/5*");
    expect(formatStatValue([2, 5, 1], [false, true])).toBe("2/5*");
  });

  it("formats flagged split values when enabled", () => {
    expect(formatStatValue([4, 6, 1])).toBe("4/6");
  });

  it("formats split values using parentheses when requested", () => {
    expect(formatStatValue([4, 6, 1, "paren"])).toBe("4(6)");
  });

  it("formats wildcard using parentheses when requested", () => {
    expect(formatStatValue([4, -1, 1, "paren"])).toBe("4(*)");
  });

  it("ignores asterisk flags for wildcard-only values", () => {
    expect(formatStatValue(-1, [true])).toBe("*");
  });

  it("formats split values using leading parentheses when requested", () => {
    expect(formatStatValue([4, 6, 1, "paren-leading"])).toBe("(4)6");
  });

  it("formats flagged split values as single when disabled", () => {
    expect(formatStatValue([4, 6, 0])).toBe("4");
  });
});
