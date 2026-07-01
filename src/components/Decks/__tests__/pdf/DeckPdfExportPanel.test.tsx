import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import DeckPdfExportPanel from "@/components/Decks/pdf/DeckPdfExportPanel";

import type { DeckPdfExportSummary } from "@/components/Decks/deck-export";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      (
        {
          "decks.pdf.summary.scope.label": "Sets to include",
          "decks.pdf.summary.scope.complete": "Complete deck",
          "decks.pdf.summary.scope.all": "All sets",
          "decks.pdf.summary.scope.selected": "Selected sets",
          "decks.pdf.summary.selection.help.complete": "Include only sets that have entries.",
          "decks.pdf.summary.selection.help.all":
            "Include all sets, even sets with no entries. Empty sets export their back face with a single front placeholder.",
          "decks.pdf.summary.selection.help.selected":
            "Select sets to include. Empty sets export their back face with a single front placeholder.",
          "decks.pdf.summary.hideEmpty.label": "Hide empty sets",
          "decks.pdf.summary.hideEmpty.hidden": `Hide empty sets (${vars?.count ?? ""} hidden)`,
          "decks.pdf.summary.hideUnselected.label": "Hide unselected sets",
          "decks.pdf.summary.hideUnselected.hidden": `Hide unselected sets (${vars?.count ?? ""} hidden)`,
          "decks.pdf.summary.entryCount.one": `${vars?.count ?? ""} entry`,
          "decks.pdf.summary.entryCount.other": `${vars?.count ?? ""} entries`,
          "decks.pdf.summary.includedSets.complete": `Complete sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.all": `All sets: ${vars?.count ?? ""}`,
          "decks.pdf.summary.includedSets.selected": `Selected sets: ${vars?.count ?? ""}`,
          "ui.loading": "Loading",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/common/CardThumbnail", () => ({
  __esModule: true,
  default: () => <div data-testid="card-thumbnail" />,
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: () => null,
}));

const summary: DeckPdfExportSummary = {
  totalSetCount: 2,
  includedSetCount: 1,
  includedEmptySetCount: 0,
  excludedEmptySetCount: 1,
  excludedNonEmptySetCount: 0,
  totalEntryQuantity: 8,
  exportSlotQuantity: 8,
  frontFaceCount: 8,
  backFaceCount: 8,
  totalFaceCount: 16,
  sets: [
    {
      setId: "set-1",
      setTitle: "Set One",
      backFaceId: "back-1",
      hasEntries: true,
      entryCount: 2,
    },
    {
      setId: "set-2",
      setTitle: "Set Two",
      backFaceId: "back-2",
      hasEntries: false,
      entryCount: 0,
    },
  ],
};

describe("DeckPdfExportPanel", () => {
  it("shows a read-only tray in complete mode and dims incomplete sets", () => {
    render(
      <DeckPdfExportPanel
        isOpen
        summary={summary}
        setScopeMode="complete"
        selectedSetIds={new Set(["set-1"])}
        onSetScopeMode={jest.fn()}
        onToggleSet={jest.fn()}
      />,
    );

    const completeSet = screen.getByRole("button", { name: /set one/i });
    const incompleteSet = screen.getByRole("button", { name: /set two/i });

    expect(screen.getByText("Include only sets that have entries.")).toBeInTheDocument();
    expect(completeSet).toHaveAttribute("data-included", "true");
    expect(completeSet).toHaveAttribute("data-interactive", "false");
    expect(incompleteSet).toHaveAttribute("data-included", "false");
    expect(incompleteSet).toHaveAttribute("data-disabled", "true");
    expect(screen.queryByText("Empty excluded: 1")).not.toBeInTheDocument();
  });

  it("shows all sets as included in all mode without the hide filter", () => {
    render(
      <DeckPdfExportPanel
        isOpen
        summary={summary}
        setScopeMode="all"
        selectedSetIds={new Set(["set-1"])}
        onSetScopeMode={jest.fn()}
        onToggleSet={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Include all sets, even sets with no entries. Empty sets export their back face with a single front placeholder.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Hide empty sets")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set two/i })).toHaveAttribute("data-included", "true");
  });

  it("hides unselected sets in selected mode after toggling the filter", () => {
    function StatefulPanel() {
      const [selectedSetIds, setSelectedSetIds] = useState(new Set(["set-1", "set-2"]));

      return (
        <DeckPdfExportPanel
          isOpen
          summary={{ ...summary, includedSetCount: 2, includedEmptySetCount: 1 }}
          setScopeMode="selected"
          selectedSetIds={selectedSetIds}
          onSetScopeMode={jest.fn()}
          onToggleSet={(setId) =>
            setSelectedSetIds((prev) => {
              const next = new Set(prev);
              if (next.has(setId)) next.delete(setId);
              else next.add(setId);
              return next;
            })
          }
        />
      );
    }

    render(<StatefulPanel />);

    fireEvent.click(screen.getByLabelText("Hide unselected sets"));
    fireEvent.click(screen.getByRole("button", { name: /set two/i }));

    expect(screen.getByLabelText("Hide unselected sets (1 hidden)")).toBeChecked();
    expect(screen.queryByRole("button", { name: /set two/i })).not.toBeInTheDocument();
  });
});
