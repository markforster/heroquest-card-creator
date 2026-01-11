import { DEFAULT_STAT_LABELS, loadStatLabelOverrides } from "@/lib/stat-labels";

describe("loadStatLabelOverrides", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns defaults and persists them when nothing is stored", () => {
    expect(window.localStorage.getItem("hqcc.statLabels")).toBeNull();
    const value = loadStatLabelOverrides();
    expect(value).toEqual(DEFAULT_STAT_LABELS);
    expect(window.localStorage.getItem("hqcc.statLabels")).toBe(JSON.stringify(DEFAULT_STAT_LABELS));
  });

  it("returns defaults and persists them when stored JSON is invalid", () => {
    window.localStorage.setItem("hqcc.statLabels", "{not-json");
    const value = loadStatLabelOverrides();
    expect(value).toEqual(DEFAULT_STAT_LABELS);
    expect(window.localStorage.getItem("hqcc.statLabels")).toBe(JSON.stringify(DEFAULT_STAT_LABELS));
  });

  it("returns defaults when localStorage.getItem throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(loadStatLabelOverrides()).toEqual(DEFAULT_STAT_LABELS);

    spy.mockRestore();
  });

  it("normalizes stored values and rewrites when normalization changes", () => {
    window.localStorage.setItem(
      "hqcc.statLabels",
      JSON.stringify({
        statLabelsEnabled: true,
        statsLabelAttack: "  ATK ",
      }),
    );
    const value = loadStatLabelOverrides();
    expect(value.statLabelsEnabled).toBe(true);
    expect(value.statsLabelAttack).toBe("ATK");
    expect(window.localStorage.getItem("hqcc.statLabels")).toContain("\"statsLabelAttack\":\"ATK\"");
  });
});
