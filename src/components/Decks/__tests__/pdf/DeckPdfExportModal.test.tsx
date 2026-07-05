import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import DeckPdfExportModal from "@/components/Decks/pdf/DeckPdfExportModal";

import type { PrintConfig } from "@/lib/pdf-export";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "decks.pdf.modal.title": "Export deck PDF",
          "actions.cancel": "Cancel",
          "actions.confirm": "Confirm",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

jest.mock("@/components/common/ActionBar", () => ({
  __esModule: true,
  default: ({ right }: { right: ReactNode }) => <div>{right}</div>,
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
    footer,
    onClose,
  }: {
    isOpen: boolean;
    title: ReactNode;
    children: ReactNode;
    footer: ReactNode;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <button type="button" onClick={onClose}>
          Close
        </button>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

jest.mock("@/components/Export/PdfExportConfigForm", () => ({
  __esModule: true,
  default: ({
    config,
    onChange,
  }: {
    config: PrintConfig;
    onChange: (next: PrintConfig) => void;
  }) => (
    <div>
      <div data-testid="paper-value">{config.paper}</div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...config,
            paper: config.paper === "A4" ? "Letter" : "A4",
            cardMm: { ...config.cardMm, width: config.cardMm.width + 1 },
          })
        }
      >
        Change config
      </button>
    </div>
  ),
}));

const baseConfig: PrintConfig = {
  paper: "A4",
  orientation: "landscape",
  marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
  gapMm: { x: 0, y: 0 },
  cardMm: { width: 63.5, height: 88.9 },
  mode: "frontAndBack",
  bleedMode: "bakedInImage",
  bleedMm: 3,
  duplexPreset: "mirrorX",
};

describe("DeckPdfExportModal", () => {
  it("does not render when closed", () => {
    render(
      <DeckPdfExportModal
        isOpen={false}
        initialConfig={baseConfig}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    expect(screen.queryByText("Export deck PDF")).not.toBeInTheDocument();
  });

  it("confirms with the edited config", () => {
    const onConfirm = jest.fn();

    render(
      <DeckPdfExportModal
        isOpen
        initialConfig={baseConfig}
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change config" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        paper: "Letter",
        cardMm: expect.objectContaining({ width: 64.5 }),
      }),
    );
  });

  it("resets edited state on cancel and modal close", () => {
    const onCancel = jest.fn();
    const { rerender } = render(
      <DeckPdfExportModal
        isOpen
        initialConfig={baseConfig}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change config" }));
    expect(screen.getByTestId("paper-value")).toHaveTextContent("Letter");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    rerender(
      <DeckPdfExportModal
        isOpen={false}
        initialConfig={baseConfig}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );
    rerender(
      <DeckPdfExportModal
        isOpen
        initialConfig={baseConfig}
        onCancel={onCancel}
        onConfirm={jest.fn()}
      />,
    );

    expect(screen.getByTestId("paper-value")).toHaveTextContent("A4");

    fireEvent.click(screen.getByRole("button", { name: "Change config" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("disables confirm when card dimensions are invalid", () => {
    render(
      <DeckPdfExportModal
        isOpen
        initialConfig={{ ...baseConfig, cardMm: { width: 0, height: 88.9 } }}
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });
});
