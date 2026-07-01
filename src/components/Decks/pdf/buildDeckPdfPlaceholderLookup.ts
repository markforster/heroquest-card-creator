import {
  createDeckPdfPlaceholderFrontId,
  type DeckPdfRunData,
} from "@/components/Decks/deck-export";
import type { PdfExportPlaceholderSpec } from "@/components/Export/PdfExportShellModal";

export function buildDeckPdfPlaceholderLookup(
  runData: DeckPdfRunData | null,
): Record<string, PdfExportPlaceholderSpec> {
  if (!runData) return {};

  return Object.fromEntries(
    runData.sets.map((set) => [
      createDeckPdfPlaceholderFrontId(set.setId),
      {
        variant: "empty-front",
        title: "EMPTY FRONT",
        subtitle: set.setTitle,
      },
    ]),
  );
}
