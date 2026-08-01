import { isTextBoundsDebugEnabled } from "@/lib/debug-flags";

describe("isTextBoundsDebugEnabled", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("is enabled only for the exact stored opt-in value", () => {
    expect(isTextBoundsDebugEnabled()).toBe(false);
    window.localStorage.setItem("hqcc.debugTextBounds", "1");
    expect(isTextBoundsDebugEnabled()).toBe(true);
  });

  it("falls back to disabled when storage is unavailable", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(isTextBoundsDebugEnabled()).toBe(false);
  });
});
