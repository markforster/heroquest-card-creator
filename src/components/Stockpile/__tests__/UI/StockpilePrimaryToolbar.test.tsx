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
        "label.gridView": "Grid",
        "label.tableView": "Table",
        "tooltip.filterCards": "Filter cards",
        "tooltip.sortCards": "Sort cards",
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
        { value: "face:all", label: "All faces" },
        { value: "face:front", label: "Front" },
        { value: "face:back", label: "Back" },
      ],
    },
    {
      label: "Type",
      options: [
        { value: "type:all", label: "All types" },
        { value: "type:monster", label: "Monster card" },
      ],
    },
  ];

  it("renders search, grouped filter, the Not paired toggle, and the view switcher", () => {
    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[
          { value: "modified", label: "Last modified" },
          { value: "name", label: "Card name" },
          { value: "created", label: "Date created" },
        ]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search cards" })).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-react-select")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Not paired" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "View mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Table" })).toBeInTheDocument();
  });

  it("renders the clear button for non-empty search and clears it on click", () => {
    const onSearchChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search="hello"
        onSearchChange={onSearchChange}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("calls onFilterChange with the selected grouped option value", () => {
    const onFilterChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={() => {}}
        filterValue="type:all"
        onFilterChange={onFilterChange}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
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
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={onSortChange}
        sortOptions={[
          { value: "modified", label: "Last modified" },
          { value: "name", label: "Card name" },
          { value: "created", label: "Date created" },
        ]}
      />,
    );

    fireEvent.change(screen.getAllByTestId("mock-react-select")[1], { target: { value: "name" } });
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("calls onViewModeChange when switching views", () => {
    const onViewModeChange = jest.fn();

    render(
      <StockpilePrimaryToolbar
        search=""
        onSearchChange={() => {}}
        viewMode="grid"
        onViewModeChange={onViewModeChange}
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
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
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={() => {}}
        isSearchDisabled
        isFilterDisabled
        isSortDisabled
        isViewModeDisabled
        isUnpairedToggleDisabled
      />,
    );

    expect(screen.getByRole("searchbox", { name: "Search cards" })).toBeDisabled();
    expect(screen.getAllByTestId("mock-react-select")[0]).toBeDisabled();
    expect(screen.getAllByTestId("mock-react-select")[1]).toBeDisabled();
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
        filterValue="type:all"
        onFilterChange={() => {}}
        filterOptions={filterOptions}
        sortValue="modified"
        onSortChange={() => {}}
        sortOptions={[{ value: "modified", label: "Last modified" }]}
        showUnpairedOnly={false}
        onShowUnpairedOnlyChange={onShowUnpairedOnlyChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Not paired" }));
    expect(onShowUnpairedOnlyChange).toHaveBeenCalledWith(true);
  });
});
