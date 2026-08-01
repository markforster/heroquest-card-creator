import { formatBytes } from "@/components/Assets/asset-formatters";

describe("formatBytes", () => {
  it.each([
    [Number.NaN, "0 B"],
    [Number.POSITIVE_INFINITY, "0 B"],
    [-10, "0 B"],
    [999, "999 B"],
    [1024, "1.00 KB"],
    [12 * 1024, "12.0 KB"],
    [120 * 1024, "120 KB"],
    [1024 ** 2, "1.00 MB"],
    [1024 ** 3, "1.00 GB"],
    [1024 ** 4, "1024 GB"],
  ])("formats %s bytes as %s", (value, expected) => {
    expect(formatBytes(value)).toBe(expected);
  });
});
