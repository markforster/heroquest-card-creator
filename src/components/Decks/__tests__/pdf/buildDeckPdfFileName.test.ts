import {
  buildDeckPdfAlignmentFileName,
  buildDeckPdfFileName,
} from "@/components/Decks/pdf/deckPdfFileName";

describe("buildDeckPdfFileName", () => {
  const localDate = new Date(2026, 5, 30, 19, 48, 6);

  it("builds a readable deck pdf filename from the deck title", () => {
    expect(
      buildDeckPdfFileName({
        deckName: "My Hero Quest Deck",
        date: localDate,
      }),
    ).toBe("HQCC--my-hero-quest-deck-2026-06-30-19-48-06.pdf");
  });

  it("sanitizes punctuation and diacritics", () => {
    expect(
      buildDeckPdfFileName({
        deckName: "Élf's Treasure / Demo!",
        date: localDate,
      }),
    ).toBe("HQCC--elf-s-treasure-demo-2026-06-30-19-48-06.pdf");
  });

  it("uses an untitled fallback when the deck name becomes empty", () => {
    expect(
      buildDeckPdfFileName({
        deckName: "   ",
        date: localDate,
      }),
    ).toBe("HQCC--untitled-deck-2026-06-30-19-48-06.pdf");
  });

  it("appends a readable suffix when provided", () => {
    expect(
      buildDeckPdfFileName({
        deckName: "Hero Quest",
        suffix: "alignment test",
        date: localDate,
      }),
    ).toBe("HQCC--hero-quest-alignment-test-2026-06-30-19-48-06.pdf");
  });

  it("builds a dedicated alignment test filename", () => {
    expect(buildDeckPdfAlignmentFileName(localDate)).toBe(
      "hqcc-pdf-alignment-test-2026-06-30-19-48-06.pdf",
    );
  });
});
