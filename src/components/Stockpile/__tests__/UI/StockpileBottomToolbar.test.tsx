import { fireEvent, render, screen } from "@testing-library/react";

import StockpileBottomToolbar from "@/components/Stockpile/StockpileBottomToolbar";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "form.selectNone": "Select none",
        "form.selectAll": "Select all",
        "actions.addToCollection": "Add to collection",
        "actions.delete": "Delete",
        "actions.export": "Export",
        "actions.load": "Load",
        "aria.stockpileToolbarActions": "Stockpile toolbar actions",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileBottomToolbar", () => {
  it("renders selection controls on the left and actions on the right", () => {
    render(
      <StockpileBottomToolbar
        isSelectAllChecked={false}
        isSelectAllIndeterminate={false}
        isSelectAllDisabled={false}
        isSelectNoneDisabled={false}
        deleteLabel="Delete"
        exportLabel="Export"
        onSelectAllToggle={() => {}}
        onSelectNone={() => {}}
        onAddToCollection={() => {}}
        onDelete={() => {}}
        onExport={() => {}}
        onLoad={() => {}}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select none" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Stockpile toolbar actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
    expect(screen.getAllByText("Add to collection")).toHaveLength(1);
    expect(screen.getAllByText("Delete")).toHaveLength(1);
    expect(screen.getAllByText("Export")).toHaveLength(1);
    expect(screen.getAllByText("Load")).toHaveLength(1);
  });

  it("wires the selection and action callbacks", () => {
    const onSelectNone = jest.fn();
    const onSelectAllToggle = jest.fn();
    const onAddToCollection = jest.fn();
    const onDelete = jest.fn();
    const onExport = jest.fn();
    const onLoad = jest.fn();

    render(
      <StockpileBottomToolbar
        isSelectAllChecked={false}
        isSelectAllIndeterminate={false}
        isSelectAllDisabled={false}
        isSelectNoneDisabled={false}
        deleteLabel="Delete (2)"
        exportLabel="Export (2)"
        isAddToCollectionDisabled={false}
        isDeleteDisabled={false}
        isExportDisabled={false}
        isLoadDisabled={false}
        onSelectAllToggle={onSelectAllToggle}
        onSelectNone={onSelectNone}
        onAddToCollection={onAddToCollection}
        onDelete={onDelete}
        onExport={onExport}
        onLoad={onLoad}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    fireEvent.click(screen.getByRole("button", { name: "Select none" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to collection" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Export (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    expect(onSelectNone).toHaveBeenCalledTimes(1);
    expect(onSelectAllToggle).toHaveBeenCalledTimes(1);
    expect(onAddToCollection).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state across selection and action controls", () => {
    render(
      <StockpileBottomToolbar
        isSelectAllChecked={true}
        isSelectAllIndeterminate={false}
        isSelectAllDisabled={true}
        isSelectNoneDisabled={true}
        deleteLabel="Delete"
        exportLabel="Export"
        isAddToCollectionDisabled={true}
        isDeleteDisabled={true}
        isExportDisabled={true}
        isLoadDisabled={true}
        onSelectAllToggle={() => {}}
        onSelectNone={() => {}}
        onAddToCollection={() => {}}
        onDelete={() => {}}
        onExport={() => {}}
        onLoad={() => {}}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Select all" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Select none" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to collection" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Load" })).toBeDisabled();
  });

  it("applies indeterminate state to the select-all checkbox", () => {
    render(
      <StockpileBottomToolbar
        isSelectAllChecked={false}
        isSelectAllIndeterminate={true}
        isSelectAllDisabled={false}
        isSelectNoneDisabled={false}
        deleteLabel="Delete"
        exportLabel="Export"
        onSelectAllToggle={() => {}}
        onSelectNone={() => {}}
        onAddToCollection={() => {}}
        onDelete={() => {}}
        onExport={() => {}}
        onLoad={() => {}}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select all" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    expect(checkbox.indeterminate).toBe(true);
  });
});
