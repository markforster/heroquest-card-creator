import { fireEvent, render, screen } from "@testing-library/react";

import CollectionsFilterSelect from "@/components/common/CollectionsFilterSelect";

type MockOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: MockOption[];
    value: MockOption | null;
    onChange: (option: MockOption | null) => void;
    isOptionDisabled?: (option: MockOption) => boolean;
    isSearchable?: boolean;
    inputId?: string;
    placeholder?: string;
  }) {
    const selectedValue = props.value?.value ?? "";
    return (
      <>
        <div data-testid="mock-react-select-searchable">{String(Boolean(props.isSearchable))}</div>
        <div data-testid="mock-react-select-placeholder">{props.placeholder ?? ""}</div>
        <select
          data-testid="mock-react-select"
          id={props.inputId}
          value={selectedValue}
          onChange={(event) => {
            const next = props.options.find((option) => option.value === event.target.value) ?? null;
            props.onChange(next);
          }}
        >
          {props.value === null ? <option value="">{props.placeholder ?? ""}</option> : null}
          {props.options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={props.isOptionDisabled?.(option) ?? option.isDisabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </>
    );
  };
});

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "actions.recentCards") return "Recent";
      if (key === "actions.allCards") return "All cards";
      if (key === "actions.unfiled") return "Unfiled";
      return key;
    },
  }),
}));

describe("CollectionsFilterSelect", () => {
  it("renders system filters when enabled", () => {
    render(
      <CollectionsFilterSelect
        inputId="collections-filter-select"
        ariaLabel="Collections"
        selectedValue={{ type: "all" }}
        onValueChange={jest.fn()}
        collections={[
          { id: "c1", name: "Decks/DungeonBeasts.v1/monsters", cardIds: ["1"] },
          { id: "c2", name: "Backs/Backs", cardIds: ["1", "2"] },
        ]}
        includeSystemFilters
        recentCardsCount={2}
        overallCount={10}
        unfiledCount={1}
      />,
    );

    const options = Array.from(screen.getByTestId("mock-react-select").querySelectorAll("option"));
    expect(options.map((option) => option.value)).toEqual([
      "recent",
      "all",
      "unfiled",
      "__divider__",
      "folder:Backs",
      "collection:c2",
      "folder:Decks",
      "folder:Decks/DungeonBeasts.v1",
      "collection:c1",
    ]);
    expect(screen.getByTestId("mock-react-select-searchable")).toHaveTextContent("false");
  });

  it("hides system filters when disabled", () => {
    render(
      <CollectionsFilterSelect
        ariaLabel="Collections"
        selectedValue={{ type: "collection", id: "c1" }}
        onValueChange={jest.fn()}
        collections={[
          { id: "c1", name: "Backs/Inventory", cardIds: ["1"] },
          { id: "c2", name: "Backs/Spell and Skill", cardIds: ["1", "2"] },
        ]}
        includeSystemFilters={false}
      />,
    );

    const options = Array.from(screen.getByTestId("mock-react-select").querySelectorAll("option"));
    expect(options.map((option) => option.value)).toEqual([
      "folder:Backs",
      "collection:c1",
      "collection:c2",
    ]);
  });

  it("returns system filter values and collection selections", () => {
    const onValueChange = jest.fn();
    render(
      <CollectionsFilterSelect
        ariaLabel="Collections"
        selectedValue={{ type: "all" }}
        onValueChange={onValueChange}
        collections={[{ id: "c1", name: "heroes", cardIds: ["1", "2"] }]}
        includeSystemFilters
        recentCardsCount={2}
        overallCount={10}
        unfiledCount={1}
      />,
    );

    fireEvent.change(screen.getByTestId("mock-react-select"), {
      target: { value: "recent" },
    });
    fireEvent.change(screen.getByTestId("mock-react-select"), {
      target: { value: "collection:c1" },
    });

    expect(onValueChange).toHaveBeenNthCalledWith(1, { type: "recent" });
    expect(onValueChange).toHaveBeenNthCalledWith(2, { type: "collection", id: "c1" });
  });

  it("renders placeholder state when empty selection is allowed", () => {
    render(
      <CollectionsFilterSelect
        ariaLabel="Collections"
        selectedValue={null}
        onValueChange={jest.fn()}
        collections={[{ id: "c1", name: "heroes", cardIds: ["1", "2"] }]}
        includeSystemFilters={false}
        allowEmptySelection
        placeholder="Select a collection"
      />,
    );

    expect(screen.getByTestId("mock-react-select")).toHaveValue("");
    expect(screen.getByTestId("mock-react-select-placeholder")).toHaveTextContent(
      "Select a collection",
    );
  });
});
