import { fireEvent, render, screen } from "@testing-library/react";

import StockpileToolbar from "@/components/Stockpile/StockpileToolbar";

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: Array<{ value: string; label: string } | { label: string; options: Array<{ value: string; label: string }> }>;
    value: { value: string; label: string } | null;
    onChange: (option: { value: string; label: string } | null) => void;
    isDisabled?: boolean;
  }) {
    const flatOptions = props.options.flatMap((option) => ("options" in option ? option.options : [option]));

    return (
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

  it("renders collections toggle and triggers handler", () => {
    const onOpenCollections = jest.fn();

    render(
      <StockpileToolbar
        onOpenCollections={onOpenCollections}
        collectionsToggleLabel="All cards"
        search=""
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

    fireEvent.click(screen.getByRole("button", { name: "Collections" }));
    expect(onOpenCollections).toHaveBeenCalledTimes(1);
  });

  it("can suppress the standalone Not paired checkbox", () => {
    render(
      <StockpileToolbar
        onOpenCollections={() => {}}
        collectionsToggleLabel="All cards"
        search=""
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
        showUnpairedToggle={false}
      />,
    );

    expect(screen.queryByText("Not paired")).not.toBeInTheDocument();
  });
});
