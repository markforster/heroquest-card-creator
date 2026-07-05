import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import FormSelect from "@/components/common/FormSelect";

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
    inputId?: string;
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
        <select
          data-testid="mock-react-select"
          id={props.inputId}
          value={props.value?.value ?? ""}
          disabled={props.isDisabled}
          onChange={(event) => {
            const next = props.options.find((option) => option.value === event.target.value) ?? null;
            props.onChange(next);
          }}
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div data-testid="mock-react-select-options">
          {props.options.map((option) => (
            <div key={option.value}>
              {props.formatOptionLabel ? props.formatOptionLabel(option, { context: "menu" }) : option.label}
            </div>
          ))}
        </div>
      </div>
    );
  };
});

describe("FormSelect", () => {
  const options = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ];

  it("renders the selected label", () => {
    render(<FormSelect options={options} value="beta" onChange={jest.fn()} />);

    expect(screen.getByTestId("mock-react-select-selected")).toHaveTextContent("Beta");
  });

  it("exposes all options", () => {
    render(<FormSelect options={options} value="alpha" onChange={jest.fn()} />);

    expect(Array.from(screen.getByTestId("mock-react-select").querySelectorAll("option")).map((option) => option.value)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("calls onChange with the selected string value", () => {
    const onChange = jest.fn();
    render(<FormSelect options={options} value="alpha" onChange={onChange} />);

    fireEvent.change(screen.getByTestId("mock-react-select"), { target: { value: "gamma" } });

    expect(onChange).toHaveBeenCalledWith("gamma");
  });

  it("respects disabled state", () => {
    render(<FormSelect options={options} value="alpha" disabled onChange={jest.fn()} />);

    expect(screen.getByTestId("mock-react-select-disabled")).toHaveTextContent("true");
    expect(screen.getByTestId("mock-react-select")).toBeDisabled();
  });

  it("disables free-text search", () => {
    render(<FormSelect options={options} value="alpha" onChange={jest.fn()} />);

    expect(screen.getByTestId("mock-react-select-searchable")).toHaveTextContent("false");
  });
});
