import { fireEvent, render, screen } from "@testing-library/react";

import StockpileActionsBar from "@/components/Stockpile/StockpileActionsBar";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "label.gridView": "Grid",
        "label.tableView": "Table",
        "tooltip.selectAllCards": "Select all",
        "form.selectAll": "Select all",
        "actions.restore": "Restore",
        "actions.deletePermanently": "Delete permanently",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileActionsBar (UI)", () => {
  it("renders Restore button in Recently deleted view and triggers handler", () => {
    const onRestoreCards = jest.fn();

    render(
      <StockpileActionsBar
        viewMode="grid"
        onViewModeChange={() => {}}
        isPairBacks={false}
        filteredCards={[]}
        selectedIds={["a", "b"]}
        activeFilter={{ type: "recentlyDeleted" }}
        onRemoveFromCollection={() => {}}
        onRestoreCards={onRestoreCards}
        onDeleteCards={() => {}}
        onSelectAllToggle={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Restore/i }));
    expect(onRestoreCards).toHaveBeenCalledTimes(1);
  });

  it("disables Restore button when nothing is selected", () => {
    render(
      <StockpileActionsBar
        viewMode="grid"
        onViewModeChange={() => {}}
        isPairBacks={false}
        filteredCards={[]}
        selectedIds={[]}
        activeFilter={{ type: "recentlyDeleted" }}
        onRemoveFromCollection={() => {}}
        onRestoreCards={() => {}}
        onDeleteCards={() => {}}
        onSelectAllToggle={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /Restore/i })).toBeDisabled();
  });
});

