import {
  createCardDeleteConfirmRequiredError,
  createPairDeleteConfirmRequiredError,
  createPairInUseError,
  isCardDeleteConfirmRequiredError,
  isPairDeleteConfirmRequiredError,
  isPairInUseError,
} from "@/lib/data/decks-errors";

describe("deck error factories and guards", () => {
  it("creates and identifies pair-in-use errors", () => {
    const usage: never[] = [];
    const error = createPairInUseError(usage);
    expect(error).toEqual({ code: "PAIR_IN_USE", usage });
    expect(isPairInUseError(error)).toBe(true);
    expect(isPairInUseError(null)).toBe(false);
    expect(isPairInUseError({ code: "OTHER" })).toBe(false);
  });

  it("creates and identifies pair deletion confirmation errors", () => {
    const report = { mode: "block" } as never;
    const error = createPairDeleteConfirmRequiredError(report);
    expect(error).toEqual({ code: "PAIR_DELETE_CONFIRM_REQUIRED", report });
    expect(isPairDeleteConfirmRequiredError(error)).toBe(true);
    expect(isPairDeleteConfirmRequiredError("error")).toBe(false);
  });

  it("creates and identifies card deletion confirmation errors", () => {
    const report = { mode: "confirmable-cascade" } as never;
    const error = createCardDeleteConfirmRequiredError(report);
    expect(error).toEqual({ code: "CARD_DELETE_CONFIRM_REQUIRED", report });
    expect(isCardDeleteConfirmRequiredError(error)).toBe(true);
    expect(isCardDeleteConfirmRequiredError({})).toBe(false);
  });
});
