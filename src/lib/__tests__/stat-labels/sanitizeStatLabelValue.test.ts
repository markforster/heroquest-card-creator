import { sanitizeStatLabelValue } from "@/lib/stat-labels";

describe("sanitizeStatLabelValue", () => {
  it("trims surrounding whitespace", () => {
    expect(sanitizeStatLabelValue("  hello  ")).toBe("hello");
  });
});

