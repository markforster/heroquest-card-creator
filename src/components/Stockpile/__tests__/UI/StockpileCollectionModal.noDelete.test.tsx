import { render, screen } from "@testing-library/react";

import StockpileCollectionModal from "@/components/Stockpile/StockpileCollectionModal";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.editCollection": "Edit collection",
        "heading.newCollection": "New collection",
        "actions.close": "Close",
        "actions.save": "Save",
        "actions.create": "Create",
        "actions.cancel": "Cancel",
        "actions.delete": "Delete",
        "form.collectionName": "Name",
        "form.collectionDescription": "Description",
        "placeholders.collectionName": "Collection name",
        "placeholders.collectionDescription": "Collection description",
        "errors.collectionNameRequired": "Required",
        "errors.collectionNameExists": "Already exists",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileCollectionModal (UI)", () => {
  it("does not render a Delete button in edit mode", () => {
    render(
      <StockpileCollectionModal
        isOpen
        mode="edit"
        collectionId="col-1"
        collections={[{ id: "col-1", name: "Backs", cardIds: [] }]}
        onCreate={async () => {}}
        onUpdate={async () => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});

