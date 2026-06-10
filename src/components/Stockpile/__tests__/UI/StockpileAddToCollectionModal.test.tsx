import { fireEvent, render, screen } from "@testing-library/react";

import StockpileAddToCollectionModal from "@/components/Stockpile/StockpileAddToCollectionModal";

type MockOption = {
  value: string;
  label: string;
};

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: MockOption[];
    value: MockOption | null;
    onChange: (option: MockOption | null) => void;
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
            <option key={option.value} value={option.value}>
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
      const lookup: Record<string, string> = {
        "heading.addToCollection": "Add to collection",
        "actions.close": "Close",
        "form.targetCollection": "Target collection",
        "form.selectCollectionPlaceholder": "Select a collection",
        "actions.add": "Add",
        "actions.cancel": "Cancel",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("StockpileAddToCollectionModal", () => {
  it("opens with no selected collection, shows placeholder, and disables search", () => {
    render(
      <StockpileAddToCollectionModal
        isOpen
        collections={[
          { id: "c1", name: "Alpha" },
          { id: "c2", name: "Beta" },
        ]}
        activeFilter={{ type: "all" }}
        visibleSelectedIds={["card-1"]}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId("mock-react-select")).toHaveValue("");
    expect(screen.getByTestId("mock-react-select-searchable")).toHaveTextContent("false");
    expect(screen.getByTestId("mock-react-select-placeholder")).toHaveTextContent(
      "Select a collection",
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("excludes the currently active collection from the target options", () => {
    render(
      <StockpileAddToCollectionModal
        isOpen
        collections={[
          { id: "c1", name: "Alpha" },
          { id: "c2", name: "Beta" },
        ]}
        activeFilter={{ type: "collection", id: "c1" }}
        visibleSelectedIds={["card-1"]}
        onSubmit={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const options = Array.from(screen.getByTestId("mock-react-select").querySelectorAll("option"));
    expect(options.map((option) => option.value)).toEqual(["", "collection:c2"]);
    expect(screen.getByTestId("mock-react-select")).toHaveValue("");
  });

  it("submits the selected collection id and visible selected ids", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <StockpileAddToCollectionModal
        isOpen
        collections={[
          { id: "c1", name: "Alpha" },
          { id: "c2", name: "Beta" },
        ]}
        activeFilter={{ type: "all" }}
        visibleSelectedIds={["card-1", "card-2"]}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );

    fireEvent.change(screen.getByTestId("mock-react-select"), {
      target: { value: "collection:c2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith("c2", ["card-1", "card-2"]);
  });

  it("does not submit when no collection is selected", () => {
    const onSubmit = jest.fn();

    render(
      <StockpileAddToCollectionModal
        isOpen
        collections={[
          { id: "c1", name: "Alpha" },
          { id: "c2", name: "Beta" },
        ]}
        activeFilter={{ type: "all" }}
        visibleSelectedIds={["card-1"]}
        onSubmit={onSubmit}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes without submitting when cancel is clicked", () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();

    render(
      <StockpileAddToCollectionModal
        isOpen
        collections={[{ id: "c1", name: "Alpha" }]}
        activeFilter={{ type: "all" }}
        visibleSelectedIds={["card-1"]}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
