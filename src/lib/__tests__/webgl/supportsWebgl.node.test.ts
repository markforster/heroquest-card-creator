/** @jest-environment node */

import { supportsWebgl } from "@/lib/webgl";

describe("supportsWebgl (node)", () => {
  it("returns false when document is undefined", () => {
    expect(supportsWebgl()).toBe(false);
  });
});
