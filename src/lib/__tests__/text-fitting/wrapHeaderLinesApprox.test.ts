/** @jest-environment node */

import { wrapHeaderLinesApprox } from "@/lib/text-fitting/legacy";

describe("wrapHeaderLinesApprox", () => {
  it("treats a visible hyphen as a breakpoint and keeps it on the first line", () => {
    expect(wrapHeaderLinesApprox("Angriffs-würfel", 150, 22)).toEqual(["Angriffs-", "würfel"]);
  });

  it("preserves space-based wrapping for ordinary stat labels", () => {
    expect(wrapHeaderLinesApprox("Attack Dice", 100, 22)).toEqual(["Attack", "Dice"]);
  });
});
