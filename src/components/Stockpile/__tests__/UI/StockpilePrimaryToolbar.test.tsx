import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import StockpilePrimaryToolbar from "@/components/Stockpile/StockpilePrimaryToolbar";

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
    formatGroupLabel?: (group: MockGroup) => ReactNode;
    isSearchable?: boolean;
    isDisabled?: boolean;
    inputId?: string;
  }) {
    const flatOptions = flattenOptions(props.options);

    return (
      <div>
        <div data-testid="mock-react-select-searchable">{String(Boolean(props.isSearchable))}</div>
        <div data-testid="mock-react-select-disabled">{String(Boolean(props.isDisabled))}</div>
        <div data-testid="mock-react-select-selected">
          {props.value && props.formatOptionLabel
            ? props.formatOptionLabel(props.value, { context: "value" })
            : props.value?.label ?? ""}
        </div>
        <select
          data-testid="mock-react-select"
          id={props.inputId}
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
        <div data-testid="mock-react-select-group-labels">
          {props.options
            .filter((option): option is MockGroup => "options" in option)
            .map((group) => (
              <div key={group.label}>
                {props.formatGroupLabel ? props.formatGroupLabel(group) : group.label}
              </div>
            ))}
        </div>
      </div>
    );
  };
});

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "tooltip.searchCards": "Search cards",
        "placeholders.searchCards": "Search cards...",
        "actions.clear": "Clear",
        "actions.allCards": "All cards",
        "label.gridView": "Grid",
        "label.tableView": "Table",
        "label.none": "None",
        "tooltip.filterCards": "Filter cards",
        "tooltip.sortCards": "Sort cards",
        "tooltip.groupCards": "Group cards",
        "aria.viewMode": "View mode",
        "warning.notPaired": "Not paired",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpilePrimaryToolbar", () => {
  const filterOptions = [
    {
      label: "Face",
      options: [
        { value: "all", label: "All cards" },
        { value: "face:front", label: "Front" },
        { value: "face:back", label: "Back" },
      ],
    },
    {
      label: "Type",
      options: [
        { value: "type:monster", label: "Monster card" },
      ],
    },
  ];

  it("renders search, filter, sort, group-by, the Not paired toggle, and the view switcher", () => {
    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[
          { value: "modified", label: "Last modified" },
          { value: "name", label: "Card name" },
          { value: "type", label: "Card type" },
        ]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[
          { value: "none", label: "None" },
          { value: "type", label: "Card type" },
          { value: "face", label: "Face" },
        ]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search cards" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-react-select")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Not paired" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "View mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Table" })).toBeInTheDocument();
  });

  it("does not render the old outer clear button for non-empty search", () => {
    render(
      <StockpilePrimaryToolbar
        search="hello"
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("registers a primary search handler that focuses the search field", () => {
    const onPrimarySearchReady = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        onPrimarySearchReady={onPrimarySearchReady}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
      />,
    );

    const handler = onPrimarySearchReady.mock.calls.at(-1)?.[0] as (() => boolean) | undefined;
    expect(handler).toBeDefined();
    expect(handler?.()).toBe(true);
    expect(screen.getByRole("searchbox", { name: "Search cards" })).toHaveFocus();
  });

  it("calls onFilterChange with the selected grouped option value", () => {
    const onFilterChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={onFilterChange}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
      />,
    );

    fireEvent.change(screen.getAllByTestId("mock-react-select")[0], { target: { value: "face:back" } });
    expect(onFilterChange).toHaveBeenCalledWith("face:back");
  });

  it("calls onSortChange with the selected sort option value", () => {
    const onSortChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={onSortChange}
        sortOptions={[
          { value: "modified", label: "Last modified" },
          { value: "name", label: "Card name" },
          { value: "type", label: "Card type" },
        ]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[
          { value: "none", label: "None" },
          { value: "type", label: "Card type" },
          { value: "face", label: "Face" },
        ]}
      />,
    );

    fireEvent.change(screen.getAllByTestId("mock-react-select")[1], { target: { value: "name" } });
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("calls onGroupChange with the selected group option value", () => {
    const onGroupChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={onGroupChange}
        groupOptions={[
          { value: "none", label: "None" },
          { value: "type", label: "Card type" },
          { value: "face", label: "Face" },
        ]}
      />,
    );

    const groupOptions = Array.from(
      screen.getAllByTestId("mock-react-select")[2].querySelectorAll("option"),
    ).map((option) => option.textContent);
    expect(groupOptions).toEqual(["None", "Card type", "Face"]);

    fireEvent.change(screen.getAllByTestId("mock-react-select")[2], { target: { value: "face" } });
    expect(onGroupChange).toHaveBeenCalledWith("face");
  });

  it("calls onViewModeChange when switching views", () => {
    const onViewModeChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={onViewModeChange}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Table" }));
    expect(onViewModeChange).toHaveBeenCalledWith("table");
  });

  it("respects disabled control state", () => {
    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
        isSearchDisabled
        isFilterDisabled
        isSortDisabled
        isGroupDisabled
        isViewModeDisabled
        isUnpairedToggleDisabled
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search cards" })).toBeDisabled();
    expect(screen.getAllByTestId("mock-react-select")[0]).toBeDisabled();
    expect(screen.getAllByTestId("mock-react-select")[1]).toBeDisabled();
    expect(screen.getAllByTestId("mock-react-select")[2]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Not paired" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Grid" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Table" })).toBeDisabled();
  });

  it("renders and toggles the compact Not paired control when provided", () => {
    const onShowUnpairedOnlyChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        groupValue="none"
        onGroupChange={() => {}}
        groupOptions={[{ value: "none", label: "None" }]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={onShowUnpairedOnlyChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Not paired" }));
    expect(onShowUnpairedOnlyChange).toHaveBeenCalledWith(true);
  });
});
