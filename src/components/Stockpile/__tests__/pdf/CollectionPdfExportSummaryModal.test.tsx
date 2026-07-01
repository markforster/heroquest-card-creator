import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import CollectionPdfExportSummaryModal from "@/components/Stockpile/pdf/CollectionPdfExportSummaryModal";

import type { SlotPair } from "@/lib/pdf-export";

const mockCapturedExportRun = jest.fn();

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "actions.export": "Export",
          "actions.fromThisCollection": "from this collection",
          "heading.collections": "Collections",
          "label.cards": "Cards",
          "alert.selectCardToExport": "Select a card",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/Export/PdfExportShellModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    slotPairs,
    shellPolicy,
    placeholderLookup,
    summaryContent,
    buildExportRun,
    buildAlignmentExportRun,
    topContent,
  }: {
    isOpen: boolean;
    title: string;
    slotPairs: SlotPair[];
    shellPolicy?: {
      mode?: { hidden?: boolean; forcedValue?: string };
      duplexPreset?: { hidden?: boolean; forcedValue?: string };
      alignmentExportHidden?: boolean;
    };
    placeholderLookup?: Record<string, unknown>;
    summaryContent?: {
      columns: Array<Array<{ text: string; tone?: "default" | "muted" }>>;
      notice?: { text: string; tone?: "default" | "muted" | "blocked" };
    };
    buildExportRun: () => Promise<unknown>;
    buildAlignmentExportRun?: () => Promise<unknown>;
    topContent?: ReactNode;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div data-testid="shell-slot-pairs">{JSON.stringify(slotPairs)}</div>
        <div data-testid="shell-mode-policy">{JSON.stringify(shellPolicy?.mode ?? null)}</div>
        <div data-testid="shell-duplex-policy">
          {JSON.stringify(shellPolicy?.duplexPreset ?? null)}
        </div>
        <div data-testid="shell-alignment-hidden">
          {String(Boolean(shellPolicy?.alignmentExportHidden))}
        </div>
        <div data-testid="shell-placeholder-count">
          {String(Object.keys(placeholderLookup ?? {}).length)}
        </div>
        <div data-testid="shell-summary-primary">
          {summaryContent?.columns[0]?.map((line) => line.text).join(" | ") ?? ""}
        </div>
        <div data-testid="shell-summary-secondary">
          {summaryContent?.columns[1]?.map((line) => `${line.tone ?? "default"}:${line.text}`).join(" | ") ??
            ""}
        </div>
        <div data-testid="shell-summary-notice">
          {summaryContent?.notice
            ? `${summaryContent.notice.tone ?? "default"}:${summaryContent.notice.text}`
            : ""}
        </div>
        <div data-testid="shell-top-content">{topContent}</div>
        <div data-testid="shell-has-alignment-run">
          {String(Boolean(buildAlignmentExportRun))}
        </div>
        <button
          type="button"
          onClick={async () => {
            const result = await buildExportRun();
            mockCapturedExportRun(result);
          }}
        >
          Run export
        </button>
      </div>
    ) : null,
}));

describe("CollectionPdfExportSummaryModal", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("composes ordered flat slot pairs, count summary, and collection shell policy", () => {
    render(
      <CollectionPdfExportSummaryModal
        isOpen
        collectionName="Treasure Set"
        faceIds={["face-a", "face-b", "face-c"]}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Export PDF")).toBeInTheDocument();
    expect(screen.getByTestId("shell-slot-pairs")).toHaveTextContent(
      JSON.stringify([
        { slotId: "collection-slot-1", frontId: "face-a", backId: null },
        { slotId: "collection-slot-2", frontId: "face-b", backId: null },
        { slotId: "collection-slot-3", frontId: "face-c", backId: null },
      ]),
    );
    expect(screen.getByTestId("shell-mode-policy")).toHaveTextContent(
      JSON.stringify({ hidden: true, forcedValue: "frontsOnly" }),
    );
    expect(screen.getByTestId("shell-duplex-policy")).toHaveTextContent(
      JSON.stringify({ hidden: true, forcedValue: "normal" }),
    );
    expect(screen.getByTestId("shell-alignment-hidden")).toHaveTextContent("true");
    expect(screen.getByTestId("shell-placeholder-count")).toHaveTextContent("0");
    expect(screen.getByTestId("shell-has-alignment-run")).toHaveTextContent("false");
    expect(screen.getByTestId("shell-summary-primary")).toHaveTextContent("Cards: 3");
    expect(screen.getByTestId("shell-summary-secondary")).toHaveTextContent(
      "muted:from this collection",
    );
    expect(screen.getByTestId("shell-top-content")).toHaveTextContent("Treasure Set");
    expect(screen.getByTestId("shell-top-content")).toHaveTextContent("Cards: 3");
  });

  it("builds a collection pdf filename and falls back to the generic collection label", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-01T12:34:56Z"));

    render(
      <CollectionPdfExportSummaryModal
        isOpen
        collectionName={null}
        faceIds={[]}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("shell-summary-notice")).toHaveTextContent(
      "blocked:Select a card",
    );

    fireEvent.click(screen.getByRole("button", { name: "Run export" }));

    await waitFor(() => {
      expect(mockCapturedExportRun).toHaveBeenCalledWith({
        fileName: "HQCC--collections-2026-07-01-13-34-56.pdf",
      });
    });

    jest.useRealTimers();
  });
});
