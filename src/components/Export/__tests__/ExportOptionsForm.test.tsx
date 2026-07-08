import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import ExportOptionsForm from "@/components/Export/ExportOptionsForm";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "heading.exportSettings": "Export Settings",
          "label.exportMarks": "Export Marks",
          "label.exportWithBleed": "Export with bleed",
          "label.bleedPixels": "Bleed pixels",
          "label.finalSize": "Final size",
          "label.exportRoundedCorners": "Rounded corners",
          "label.cropMarks": "Crop marks",
          "label.cropMarkColor": "Crop mark color",
          "label.cropMarkStyle": "Crop mark style",
          "label.cropMarkStyleLines": "Lines",
          "label.cropMarkStyleSquares": "Squares",
          "label.cropMarkStyleTriangles": "Triangles",
          "label.cutMarks": "Cut marks",
          "label.cutMarkColor": "Cut mark color",
          "label.cutMarkStyle": "Cut mark style",
          "label.cutMarkStyleSolid": "Solid",
          "label.cutMarkStyleDashed": "Dashed",
          "label.cutMarkStyleLongDashed": "Long dashed",
          "label.cutMarkStyleDotted": "Dotted",
          "label.cutMarkStyleTicks": "Ticks",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

jest.mock("@/components/common/FormSelect", () => ({
  __esModule: true,
  default: ({
    options,
    value,
    disabled,
    onChange,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    disabled?: boolean;
    onChange: (next: string) => void;
  }) => (
    <select
      data-testid="mock-form-select"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

jest.mock("@/components/Export/CutMarkStyleSelect", () => ({
  __esModule: true,
  default: ({
    value,
    disabled,
    onChange,
  }: {
    value: string;
    disabled?: boolean;
    onChange: (next: "solid" | "dashed" | "long-dashed" | "dotted" | "ticks") => void;
  }) => (
    <div>
      <div data-testid="mock-cut-mark-style-select-value">{value}</div>
      <div data-testid="mock-cut-mark-style-select-disabled">{String(Boolean(disabled))}</div>
      <button type="button" onClick={() => onChange("ticks")}>
        Set ticks
      </button>
    </div>
  ),
}));

jest.mock("@/components/Modals/SettingsModal/SettingsGroup", () => ({
  __esModule: true,
  default: ({
    title,
    className,
    children,
  }: {
    title?: string;
    className?: string;
    children: ReactNode;
  }) => (
    <section className={className} data-testid="settings-group">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
}));

jest.mock("@/hooks/usePopupState", () => ({
  usePopupState: () => ({
    isOpen: false,
    toggle: jest.fn(),
    close: jest.fn(),
  }),
}));

const baseProps = {
  bleedEnabled: true,
  bleedPx: 12,
  roundedCorners: false,
  cropMarksEnabled: true,
  cropMarkColor: "#00FFFF",
  cropMarkStyle: "lines" as const,
  cutMarksEnabled: true,
  cutMarkColor: "#FF00FF",
  cutMarkStyle: "dashed" as const,
  bleedLabelKey: "label.exportWithBleed" as const,
  headingLabelKey: "heading.exportSettings" as const,
  useSettingsGroup: true,
  onChange: jest.fn(),
};

describe("ExportOptionsForm", () => {
  it("renders stacked sections by default", () => {
    const { container } = render(<ExportOptionsForm {...baseProps} />);

    expect(container.querySelector(".exportOptionsFormSectionsColumns")).not.toBeInTheDocument();
    expect(screen.getByText("Export Settings")).toBeInTheDocument();
    expect(screen.getByText("Export Marks")).toBeInTheDocument();
  });

  it("renders two outer sections in columns when requested", () => {
    const { container } = render(<ExportOptionsForm {...baseProps} sectionLayout="columns" />);

    expect(container.querySelector(".exportOptionsFormSectionsColumns")).toBeInTheDocument();
    expect(screen.getByText("Export Settings")).toBeInTheDocument();
    expect(screen.getByText("Export Marks")).toBeInTheDocument();
  });

  it("shows and emits the triangles crop mark style", () => {
    const onChange = jest.fn();
    render(<ExportOptionsForm {...baseProps} onChange={onChange} />);

    const select = screen.getByTestId("mock-form-select");
    expect(screen.getByRole("option", { name: "Triangles" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "triangles" } });

    expect(onChange).toHaveBeenCalledWith({ cropMarkStyle: "triangles" });
  });

  it("shows and emits the ticks cut mark style", () => {
    const onChange = jest.fn();
    render(<ExportOptionsForm {...baseProps} onChange={onChange} />);

    expect(screen.getByTestId("mock-cut-mark-style-select-value")).toHaveTextContent("dashed");
    expect(screen.getByTestId("mock-cut-mark-style-select-disabled")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("Set ticks"));

    expect(onChange).toHaveBeenCalledWith({ cutMarkStyle: "ticks" });
  });

  it("disables the crop mark style select when crop marks are unavailable", () => {
    render(
      <ExportOptionsForm
        {...baseProps}
        bleedEnabled={false}
        cropMarksEnabled={false}
      />,
    );

    expect(screen.getByTestId("mock-form-select")).toBeDisabled();
  });
});
