/**
 * @jest-environment node
 */

import { DEFAULT_STAT_LABELS, saveStatLabelOverrides } from "@/lib/stat-labels";

describe("saveStatLabelOverrides (node)", () => {
  it("does nothing when window is undefined", () => {
    expect(() => saveStatLabelOverrides(DEFAULT_STAT_LABELS)).not.toThrow();
  });
});

