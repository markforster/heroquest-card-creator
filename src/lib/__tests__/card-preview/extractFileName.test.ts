import { extractFileName } from "@/lib/card-preview";

describe("extractFileName", () => {
  it("returns null for empty string", () => {
    expect(extractFileName("")).toBeNull();
  });

  it("returns the last path segment", () => {
    expect(extractFileName("https://example.com/assets/image.png")).toBe("image.png");
  });

  it("strips query and hash", () => {
    expect(extractFileName("/path/to/image.png?foo=1#bar")).toBe("image.png");
  });

  it("returns null when no filename is present", () => {
    expect(extractFileName("https://example.com/path/")).toBeNull();
  });
});
