/**
 * @jest-environment node
 */

import { getInitialLanguage } from "@/i18n/getInitialLanguage";

describe("getInitialLanguage (node)", () => {
  it("returns en when window is undefined", () => {
    expect(getInitialLanguage()).toBe("en");
  });
});

