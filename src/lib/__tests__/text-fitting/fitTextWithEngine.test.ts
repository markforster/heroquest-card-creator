/** @jest-environment node */

import { fitTextWithEngine } from "@/lib/text-fitting/engine";

describe("fitTextWithEngine stat heading hyphen support", () => {
  it("wraps a visible hyphenated heading at the user-authored breakpoint", () => {
    const result = fitTextWithEngine("statHeading", "Angriffs-würfel", { width: 150, height: 120 });

    expect(result.layout.lines).toEqual(["Angriffs-", "würfel"]);
    expect(result.layout.strategyUsed).toBe("wrap-two-line");
  });

  it("retries the user-authored hyphen breakpoint after shrink before generic splitting", () => {
    const result = fitTextWithEngine("statHeading", "Angriffs-würfel", { width: 110, height: 69 });

    expect(result.layout.lines).toEqual(["Angriffs-", "würfel"]);
    expect(result.layout.strategyUsed).toBe("hyphenate");
  });

  it("preserves ordinary space-based wrapping", () => {
    const result = fitTextWithEngine("statHeading", "Attack Dice", { width: 100, height: 120 });

    expect(result.layout.lines).toEqual(["Attack", "Dice"]);
    expect(result.layout.strategyUsed).toBe("wrap-two-line");
  });

  it("falls back deterministically for long single-token headings with no breakpoints", () => {
    const result = fitTextWithEngine("statHeading", "Verteidigungswürfel", { width: 110, height: 120 });

    expect(result.layout.strategyUsed).toBe("hyphenate");
    expect(result.layout.lines.length).toBeGreaterThan(1);
    expect(result.layout.lines[0].endsWith("-")).toBe(true);
  });

  it("continues through shrink and fallback splitting when a visible hyphen break still does not fit", () => {
    const result = fitTextWithEngine("statHeading", "Angriffs-würfel", { width: 70, height: 120 });

    expect(result.layout.strategyUsed).toBe("hyphenate");
    expect(result.layout.lines[0]).not.toBe("Angriffs-");
    expect(result.layout.lines.length).toBeGreaterThan(1);
  });
});
