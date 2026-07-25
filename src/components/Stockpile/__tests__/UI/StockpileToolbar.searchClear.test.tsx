import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import StockpileToolbar from "@/components/Stockpile/StockpileToolbar";

type MockOption = {
  value: string;
  label: string;
};

type MockGroup = {
  label: string;
  options: MockOption[];
};

function flattenOptions(options: Array<MockOption | MockGroup>) {
  return options.flatMap((option) => ("options" in option ? option.options : [option]));
}

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: Array<MockOption | MockGroup>;
    value: MockOption | null;
    onChange: (option: MockOption | null) => void;
    formatOptionLabel?: (option: MockOption, meta: { context: "menu" | "value" }) => ReactNode;
    isDisabled?: boolean;
  }) {
    const flatOptions = flattenOptions(props.options);

    return (
      <div>
        <div data-testid="mock-react-select-selected">
          {props.value && props.formatOptionLabel
            ? props.formatOptionLabel(props.value, { context: "value" })
            : props.value?.label ?? ""}
        </div>
        <select
          data-testid="mock-react-select"
          value={props.value?.value ?? ""}
          disabled={props.isDisabled}
          onChange={(event) => {
            const next = flatOptions.find((option) => option.value === event.target.value) ?? null;
            props.onChange(next);
          }}
        >
          {flatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };
});

jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  __esModule: true,
  useMissingAssets: () => ({
    missingArtworkIds: new Set(),
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "heading.collections": "Collections",
        "label.collections": "Collections",
        "tooltip.filterCards": "Filter cards",
        "tooltip.searchCards": "Search cards",
        "placeholders.searchCards": "Search cards...",
        "ui.allTypes": "All types",
        "cardFace.frontFacing": "Front-facing",
        "cardFace.backFacing": "Back-facing",
        "warning.notPaired": "Not paired",
        "label.missingArtwork": "Missing artwork",
        "actions.clear": "Clear",
        "label.gridView": "Grid",
        "label.tableView": "Table",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileToolbar (UI)", () => {
  const filterOptions = [
    {
      label: "Face",
      options: [
        { value: "all", label: "All cards" },
        { value: "face:front", label: "Front" },
        { value: "face:back", label: "Back" },
      ],
    },
  ];

  it("does not render the old outer clear button when search is non-empty", () => {
    render(
      <StockpileToolbar
        onOpenCollections={() => {}}
        collectionsToggleLabel="All cards"
        search="hello"
        onSearchChange={() => {}}
        templateFilter="all"
        onTemplateFilterChange={() => {}}
        filterValue="all"
        onFilterValueChange={() => {}}
        filterOptions={filterOptions}
        filterLabel="All types"
        totalCount={0}
        faceCounts={{ front: 0, back: 0 }}
        typeCounts={new Map()}
        isPairMode={false}
        isPairBacks={false}
        isPairFronts={false}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
        showMissingArtworkOnly={false}
        onShowMissingArtworkOnlyChange={() => {}}
        selectedCount={0}
      />,
    );
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders the shared react-select filter field and propagates changes", () => {
    const onFilterValueChange = jest.fn();

    render(
      <StockpileToolbar
        onOpenCollections={() => {}}
        collectionsToggleLabel="All cards"
        search=""
        onSearchChange={() => {}}
        templateFilter="all"
        onTemplateFilterChange={() => {}}
        filterValue="all"
        onFilterValueChange={onFilterValueChange}
        filterOptions={filterOptions}
        filterLabel="All types"
        totalCount={0}
        faceCounts={{ front: 0, back: 0 }}
        typeCounts={new Map()}
        isPairMode
        isPairBacks={false}
        isPairFronts={false}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
        showMissingArtworkOnly={false}
        onShowMissingArtworkOnlyChange={() => {}}
        selectedCount={0}
      />,
    );

    fireEvent.change(screen.getByTestId("mock-react-select"), {
      target: { value: "face:back" },
    });

    expect(onFilterValueChange).toHaveBeenCalledWith("face:back");
  });
});
