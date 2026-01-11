import { DEFAULT_STAT_LABELS, getStatLabel } from "@/lib/stat-labels";

describe("getStatLabel", () => {
  it("returns base label when overrides are disabled", () => {
    expect(getStatLabel("statsLabelAttack", "Attack", DEFAULT_STAT_LABELS)).toBe("Attack");
  });

  it("returns base label when override is empty/whitespace", () => {
    const overrides = { ...DEFAULT_STAT_LABELS, statLabelsEnabled: true, statsLabelAttack: "   " };
    expect(getStatLabel("statsLabelAttack", "Attack", overrides)).toBe("Attack");
  });

  it("returns override when enabled and non-empty", () => {
    const overrides = { ...DEFAULT_STAT_LABELS, statLabelsEnabled: true, statsLabelAttack: "ATK" };
    expect(getStatLabel("statsLabelAttack", "Attack", overrides)).toBe("ATK");
  });
});

