import {
  hasStatAsterisk,
  normalizeStatAsteriskFlags,
  setStatAsterisk,
} from "@/lib/stat-asterisks";

describe("stat asterisk helpers", () => {
  it("drops empty flag arrays", () => {
    expect(normalizeStatAsteriskFlags()).toBeUndefined();
    expect(normalizeStatAsteriskFlags([false, false])).toBeUndefined();
  });

  it("preserves compact primary-only flags", () => {
    expect(normalizeStatAsteriskFlags([true, false])).toEqual([true]);
  });

  it("preserves secondary-only flags with an explicit primary false", () => {
    expect(normalizeStatAsteriskFlags([false, true])).toEqual([false, true]);
  });

  it("reads flags by side", () => {
    expect(hasStatAsterisk([true], 0)).toBe(true);
    expect(hasStatAsterisk([true], 1)).toBe(false);
    expect(hasStatAsterisk([false, true], 1)).toBe(true);
  });

  it("sets and clears per-side flags", () => {
    expect(setStatAsterisk(undefined, 0, true)).toEqual([true]);
    expect(setStatAsterisk([true], 1, true)).toEqual([true, true]);
    expect(setStatAsterisk([true, true], 0, false)).toEqual([false, true]);
    expect(setStatAsterisk([false, true], 1, false)).toBeUndefined();
  });
});
