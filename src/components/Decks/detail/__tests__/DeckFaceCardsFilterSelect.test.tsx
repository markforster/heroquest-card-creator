import { fireEvent, render, screen } from "@testing-library/react";

import DeckFaceCardsFilterSelect from "@/components/Decks/detail/DeckFaceCardsFilterSelect";

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
  }) {
    const selectedValue = props.value?.value ?? "";
    return (
      <>
        <div data-testid="mock-react-select-searchable">{String(Boolean(props.isSearchable))}</div>
        <select
          data-testid="mock-react-select"
          id={props.inputId}
          value={selectedValue}
          onChange={(event) => {
            const next = props.options.find((option) => option.value === event.target.value) ?? null;
            props.onChange(next);
          }}
        >
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
      if (key === "heading.collections") return "Collections";
      return key;
    },
  }),
}));

describe("DeckFaceCardsFilterSelect", () => {
  it("renders system options first, a divider, then collection options", () => {
    render(
      <DeckFaceCardsFilterSelect
        activeFilter={{ type: "all" }}
        onFilterChange={jest.fn()}
        visibleCollections={[
          { id: "c1", name: "Decks/DungeonBeasts.v1/monsters", cardIds: [] },
          { id: "c2", name: "Decks/DungeonBeasts.v1/Encounters", cardIds: [] },
          { id: "c3", name: "Backs/Backs", cardIds: [] },
        ]}
        collectionCounts={
          new Map<string, number>([
            ["c1", 3],
            ["c2", 5],
            ["c3", 7],
          ])
        }
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
      "collection:c3",
      "folder:Decks",
      "folder:Decks/DungeonBeasts.v1",
      "collection:c2",
      "collection:c1",
    ]);
    expect(options[3].disabled).toBe(true);
    expect(options[4].disabled).toBe(true);
    expect(options[6].disabled).toBe(true);
    expect(options[7].disabled).toBe(true);
  });

  it("disables free-text search in react-select", () => {
    render(
      <DeckFaceCardsFilterSelect
        activeFilter={{ type: "all" }}
        onFilterChange={jest.fn()}
        visibleCollections={[{ id: "c1", name: "spells/fire", cardIds: [] }]}
        collectionCounts={new Map([["c1", 3]])}
        recentCardsCount={2}
        overallCount={10}
        unfiledCount={1}
      />,
    );

    expect(screen.getByTestId("mock-react-select-searchable")).toHaveTextContent("false");
  });

  it("maps collection selection to collection filter", () => {
    const onFilterChange = jest.fn();
    render(
      <DeckFaceCardsFilterSelect
        activeFilter={{ type: "all" }}
        onFilterChange={onFilterChange}
        visibleCollections={[{ id: "c1", name: "spells/fire", cardIds: [] }]}
        collectionCounts={new Map([["c1", 3]])}
        recentCardsCount={2}
        overallCount={10}
        unfiledCount={1}
      />,
    );

    fireEvent.change(screen.getByTestId("mock-react-select"), {
      target: { value: "collection:c1" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ type: "collection", id: "c1" });
  });

  it("reflects currently active collection as selected option", () => {
    render(
      <DeckFaceCardsFilterSelect
        activeFilter={{ type: "collection", id: "c2" }}
        onFilterChange={jest.fn()}
        visibleCollections={[
          { id: "c1", name: "spells/fire", cardIds: [] },
          { id: "c2", name: "heroes", cardIds: [] },
        ]}
        collectionCounts={
          new Map<string, number>([
            ["c1", 3],
            ["c2", 5],
          ])
        }
        recentCardsCount={2}
        overallCount={10}
        unfiledCount={1}
      />,
    );

    expect(screen.getByTestId("mock-react-select")).toHaveValue("collection:c2");
  });
});
