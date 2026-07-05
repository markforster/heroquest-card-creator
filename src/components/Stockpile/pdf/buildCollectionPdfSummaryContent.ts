import type { PdfExportSummaryContent } from "@/components/Export/PdfExportShellModal";

type Translate = (key: never, options?: Record<string, unknown>) => string;

export function buildCollectionPdfSummaryContent(
  count: number,
  t: Translate,
): PdfExportSummaryContent {
  return {
    columns: [
      [
        {
          text: `${t("label.cards" as never)}: ${count}`,
        },
      ],
      count > 0
        ? [
            {
              text: `${t("actions.fromThisCollection" as never)}`,
              tone: "muted",
            },
          ]
        : [],
    ],
    notice:
      count <= 0
        ? {
            text: t("alert.selectCardToExport" as never),
            tone: "blocked",
          }
        : undefined,
  };
}
