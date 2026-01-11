import { DEFAULT_STAT_LABELS, normalizeStatLabelOverrides } from "@/lib/stat-labels";

describe("normalizeStatLabelOverrides", () => {
  it("returns defaults and changed=true for non-objects", () => {
    expect(normalizeStatLabelOverrides(null)).toEqual({ value: DEFAULT_STAT_LABELS, changed: true });
    expect(normalizeStatLabelOverrides("nope")).toEqual({ value: DEFAULT_STAT_LABELS, changed: true });
    expect(normalizeStatLabelOverrides([])).toEqual({ value: DEFAULT_STAT_LABELS, changed: true });
  });

  it("preserves statLabelsEnabled when boolean", () => {
    const { value, changed } = normalizeStatLabelOverrides({ statLabelsEnabled: true });
    expect(value.statLabelsEnabled).toBe(true);
    expect(changed).toBe(true); // other keys are missing -> changed
  });

  it("marks changed when statLabelsEnabled is present but not boolean", () => {
    const { value, changed } = normalizeStatLabelOverrides({ statLabelsEnabled: "true" });
    expect(value.statLabelsEnabled).toBe(false);
    expect(changed).toBe(true);
  });

  it("trims string overrides and marks changed when trimming occurs", () => {
    const { value, changed } = normalizeStatLabelOverrides({
      statLabelsEnabled: true,
      statsLabelAttack: "  Attack ",
    });
    expect(value.statsLabelAttack).toBe("Attack");
    expect(changed).toBe(true);
  });

  it("marks changed when keys are present but not strings", () => {
    const { value, changed } = normalizeStatLabelOverrides({
      statLabelsEnabled: false,
      statsLabelAttack: 123,
    });
    expect(value.statsLabelAttack).toBe("");
    expect(changed).toBe(true);
  });

  it("copies legacy body/mind labels into hero/monster fields when needed", () => {
    const { value } = normalizeStatLabelOverrides({
      statLabelsEnabled: true,
      statsLabelBody: "BP",
      statsLabelMind: "MP",
    });

    expect(value.statsLabelHeroBody).toBe("BP");
    expect(value.statsLabelMonsterBodyPoints).toBe("BP");
    expect(value.statsLabelHeroMind).toBe("MP");
    expect(value.statsLabelMonsterMindPoints).toBe("MP");
  });

  it("does not overwrite explicit hero/monster fields with legacy values", () => {
    const { value } = normalizeStatLabelOverrides({
      statLabelsEnabled: true,
      statsLabelBody: "BP",
      statsLabelHeroBody: "Hero BP",
      statsLabelMonsterBodyPoints: "Monster BP",
      statsLabelMind: "MP",
      statsLabelHeroMind: "Hero MP",
      statsLabelMonsterMindPoints: "Monster MP",
    });

    expect(value.statsLabelHeroBody).toBe("Hero BP");
    expect(value.statsLabelMonsterBodyPoints).toBe("Monster BP");
    expect(value.statsLabelHeroMind).toBe("Hero MP");
    expect(value.statsLabelMonsterMindPoints).toBe("Monster MP");
  });
});
