import { DEFAULT_STAT_LABELS, saveStatLabelOverrides } from "@/lib/stat-labels";

describe("saveStatLabelOverrides", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("writes the value to localStorage", () => {
    const value = { ...DEFAULT_STAT_LABELS, statLabelsEnabled: true, statsLabelAttack: "ATK" };
    saveStatLabelOverrides(value);
    expect(window.localStorage.getItem("hqcc.statLabels")).toBe(JSON.stringify(value));
  });

  it("ignores localStorage write errors", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("nope");
    };

    expect(() => saveStatLabelOverrides(DEFAULT_STAT_LABELS)).not.toThrow();

    window.localStorage.setItem = original;
  });
});

