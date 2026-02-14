import { guessOriginalFileName } from "@/lib/card-preview";

describe("guessOriginalFileName", () => {
  it("returns the original filename as a candidate", () => {
    expect(guessOriginalFileName("image.png")).toContain("image.png");
  });

  it("removes a hash suffix from the base name", () => {
    expect(guessOriginalFileName("hero-abcdef12.png")).toEqual(
      expect.arrayContaining(["hero-abcdef12.png", "hero.png"]),
    );
  });

  it("handles multi-dot filenames with embedded hashes", () => {
    const candidates = guessOriginalFileName("hero.card-abcdef12.png");
    expect(candidates).toEqual(expect.arrayContaining(["hero.card-abcdef12.png", "hero.png"]));
  });

  it("does not add extra candidates when no hash suffix is present", () => {
    const candidates = guessOriginalFileName("hero.card.png");
    expect(candidates).toEqual(["hero.card.png", "hero.png"]);
  });
});
