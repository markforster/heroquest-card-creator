import { fireEvent, render, screen } from "@testing-library/react";

import ExportImageFormatGroup from "@/components/Modals/SettingsModal/ExportImageFormatGroup";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      ({
        "heading.exportImageFormat": "Image format",
        "label.exportImageFormatJpeg": "JPEG",
        "label.exportImageFormatPng": "PNG",
        "help.exportImageFormat": "JPEG PDFs are smaller.",
      })[key] ?? key,
  }),
}));

describe("ExportImageFormatGroup", () => {
  it("shows JPEG first and reports radio changes", () => {
    const onChange = jest.fn();

    render(<ExportImageFormatGroup value="jpeg" onChange={onChange} />);

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("value", "jpeg");
    expect(radios[0]).toBeChecked();
    expect(screen.getByText("JPEG PDFs are smaller.")).toBeInTheDocument();

    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith("png");
  });
});
