import { getNextAvailableFilename } from "@/lib/asset-filename";

describe("getNextAvailableFilename", () => {
  it("returns the incoming name when it is not already used", () => {
    expect(getNextAvailableFilename(["a.png", "b.png"], "c.png")).toBe("c.png");
  });

  it("returns the first available numeric suffix when the incoming name is used", () => {
    expect(getNextAvailableFilename(["a.png"], "a.png")).toBe("a (2).png");
  });

  it("treats the unsuffixed name as suffix 1 and finds the next available", () => {
    expect(getNextAvailableFilename(["a.png", "a (2).png"], "a.png")).toBe("a (3).png");
  });

  it("fills gaps in suffixes", () => {
    expect(getNextAvailableFilename(["a.png", "a (3).png"], "a.png")).toBe("a (2).png");
  });

  it("only considers existing names with the same extension", () => {
    expect(getNextAvailableFilename(["a.jpg", "a (2).jpg"], "a.png")).toBe("a.png");
    expect(getNextAvailableFilename(["a.jpg", "a (2).jpg", "a.png"], "a.png")).toBe("a (2).png");
  });

  it("ignores existing names with different roots", () => {
    expect(getNextAvailableFilename(["a.png", "b.png"], "a.png")).toBe("a (2).png");
  });

  it("normalizes an incoming suffixed name back to the root before computing the next suffix", () => {
    expect(getNextAvailableFilename(["a.png", "a (2).png"], "a (2).png")).toBe("a (3).png");
  });

  it("works with Set inputs without changing behavior", () => {
    const existing = new Set(["a.png", "a (2).png"]);
    expect(getNextAvailableFilename(existing, "a.png")).toBe("a (3).png");
  });
});
