import type {
  DeckPdfExportSummary,
  DeckPdfSetScopeMode,
} from "@/components/Decks/deck-export";
import type { PdfExportSummaryContent } from "@/components/Export/PdfExportShellModal";
import type { SlotPair } from "@/lib/pdf-export";

type Translate = (key: never, options?: Record<string, unknown>) => string;

type BuildDeckPdfSummaryContentArgs = {
  summary: DeckPdfExportSummary | null;
  setScopeMode: DeckPdfSetScopeMode;
  slotPairs: SlotPair[];
  t: Translate;
};

export function buildDeckPdfSummaryContent({
  summary,
  setScopeMode,
  slotPairs,
  t,
}: BuildDeckPdfSummaryContentArgs): PdfExportSummaryContent | undefined {
  if (!summary) return undefined;

  const scopeIncludedLabelKey =
    setScopeMode === "all"
      ? "decks.pdf.summary.includedSets.all"
      : setScopeMode === "selected"
        ? "decks.pdf.summary.includedSets.selected"
        : "decks.pdf.summary.includedSets.complete";

  const primaryColumn = [
    {
      text: t(scopeIncludedLabelKey as never, {
        count: summary.includedSetCount,
      }),
    },
    {
      text: t("decks.pdf.summary.totalEntryQuantity" as never, {
        count: summary.totalEntryQuantity,
      }),
    },
    {
      text: t("decks.pdf.summary.faces" as never, {
        frontCount: summary.frontFaceCount,
        backCount: summary.backFaceCount,
        totalCount: summary.totalFaceCount,
      }),
    },
  ];

  const secondaryColumn = [
    summary.includedEmptySetCount > 0 && setScopeMode !== "complete"
      ? {
          text: t("decks.pdf.summary.includedEmptySets" as never, {
            count: summary.includedEmptySetCount,
          }),
          tone: "muted" as const,
        }
      : null,
    summary.exportSlotQuantity !== summary.totalEntryQuantity
      ? {
          text: t("decks.pdf.summary.exportSlots" as never, {
            count: summary.exportSlotQuantity,
          }),
          tone: "muted" as const,
        }
      : null,
    setScopeMode === "complete" && summary.excludedEmptySetCount > 0
      ? {
          text: t("decks.pdf.summary.emptyExcluded" as never, {
            count: summary.excludedEmptySetCount,
          }),
          tone: "muted" as const,
        }
      : null,
  ].filter((line): line is NonNullable<typeof line> => Boolean(line));

  const notice =
    slotPairs.length <= 0
      ? {
          text: t("decks.pdf.summary.noneAvailable" as never),
          tone: "blocked" as const,
        }
      : undefined;

  return {
    columns: [primaryColumn, secondaryColumn],
    notice,
  };
}
