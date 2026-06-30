import { render, screen } from "@testing-library/react";
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
          "label.cutMarks": "Cut marks",
          "label.cutMarkColor": "Cut mark color",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/hooks/usePopupState", () => ({
  usePopupState: () => ({
    isOpen: false,
    toggle: jest.fn(),
    close: jest.fn(),
  }),
}));

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <div>{label}</div>,
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

const baseProps = {
  bleedEnabled: true,
  bleedPx: 12,
  roundedCorners: false,
  cropMarksEnabled: true,
  cropMarkColor: "#00FFFF",
  cropMarkStyle: "lines" as const,
  cutMarksEnabled: true,
  cutMarkColor: "#FF00FF",
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
});
