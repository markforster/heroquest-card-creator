import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import CutMarkStyleSelect from "@/components/Export/CutMarkStyleSelect";

type MockOption = {
  value: string;
  label: string;
};

jest.mock("react-select", () => {
  return function MockReactSelect(props: {
    options: MockOption[];
    value: MockOption | null;
    onChange: (option: MockOption | null) => void;
    formatOptionLabel?: (option: MockOption, meta: { context: "menu" | "value" }) => ReactNode;
    isSearchable?: boolean;
    isDisabled?: boolean;
  }) {
    return (
      <div>
        <div data-testid="mock-react-select-searchable">{String(Boolean(props.isSearchable))}</div>
        <div data-testid="mock-react-select-disabled">{String(Boolean(props.isDisabled))}</div>
        <div data-testid="mock-react-select-selected">
          {props.value && props.formatOptionLabel
            ? props.formatOptionLabel(props.value, { context: "value" })
            : props.value?.label ?? ""}
        </div>
        <div data-testid="mock-react-select-options">
          {props.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onChange(option)}
            >
              {props.formatOptionLabel ? props.formatOptionLabel(option, { context: "menu" }) : option.label}
            </button>
          ))}
        </div>
      </div>
    );
  };
});

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "label.cutMarkStyleSolid": "Solid",
          "label.cutMarkStyleDashed": "Dashed",
          "label.cutMarkStyleLongDashed": "Long dashed",
          "label.cutMarkStyleDotted": "Dotted",
          "label.cutMarkStyleTicks": "Ticks",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe("CutMarkStyleSelect", () => {
  it("renders the selected localized label and preview", () => {
    render(<CutMarkStyleSelect value="dashed" onChange={jest.fn()} />);

    expect(screen.getByTestId("mock-react-select-selected")).toHaveTextContent("Dashed");
    expect(screen.getByTestId("mock-react-select-selected").querySelector(
      '[data-cut-mark-style-preview="dashed"]',
    )).not.toBeNull();
    expect(screen.getByTestId("mock-react-select-searchable")).toHaveTextContent("false");
  });

  it("exposes all five style options", () => {
    render(<CutMarkStyleSelect value="dashed" onChange={jest.fn()} />);

    expect(screen.getAllByText("Dashed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Solid").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Long dashed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dotted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ticks").length).toBeGreaterThan(0);
  });

  it("calls onChange with the exact selected style", () => {
    const onChange = jest.fn();
    render(<CutMarkStyleSelect value="dashed" onChange={onChange} />);

    fireEvent.click(screen.getAllByText("Long dashed")[0]);

    expect(onChange).toHaveBeenCalledWith("long-dashed");
  });

  it("respects disabled state", () => {
    render(<CutMarkStyleSelect value="dashed" disabled onChange={jest.fn()} />);

    expect(screen.getByTestId("mock-react-select-disabled")).toHaveTextContent("true");
  });

  it("renders preview markup for selected value and menu options", () => {
    render(<CutMarkStyleSelect value="ticks" onChange={jest.fn()} />);

    const previews = document.querySelectorAll('[data-cut-mark-style-preview]');
    expect(previews.length).toBe(6);
    expect(document.querySelectorAll('[data-cut-mark-style-preview="ticks"]').length).toBeGreaterThan(1);
    expect(document.querySelectorAll('[data-cut-mark-style-preview="solid"]').length).toBe(1);
  });
});
