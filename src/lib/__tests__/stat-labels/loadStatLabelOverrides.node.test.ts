/**
 * @jest-environment node
 */

import { DEFAULT_STAT_LABELS, loadStatLabelOverrides } from "@/lib/stat-labels";

describe("loadStatLabelOverrides (node)", () => {
  it("returns defaults when window is undefined", () => {
    expect(loadStatLabelOverrides()).toEqual(DEFAULT_STAT_LABELS);
  });
});

