import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import DeckPdfExportProgressModal from "@/components/Decks/pdf/DeckPdfExportProgressModal";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        {
          "actions.cancel": "Cancel",
          "actions.cancelling": "Cancelling",
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
  }: {
    isOpen: boolean;
    title: ReactNode;
    children: ReactNode;
  }) => (isOpen ? <div><div>{title}</div>{children}</div> : null),
}));

jest.mock("@/components/common/ProgressBar", () => ({
  __esModule: true,
  default: ({ percent }: { percent: number }) => <div data-testid="progress-bar">{percent}</div>,
}));

describe("DeckPdfExportProgressModal", () => {
  it("does not render when closed", () => {
    render(
      <DeckPdfExportProgressModal
        isOpen={false}
        title="Exporting"
        progress={1}
        total={4}
        phaseLabel="Rendering"
        isCancelling={false}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText("Exporting")).not.toBeInTheDocument();
  });

  it("renders progress, optional phase label, and cancel action", () => {
    const onCancel = jest.fn();

    render(
      <DeckPdfExportProgressModal
        isOpen
        title="Exporting"
        progress={3}
        total={8}
        phaseLabel="Rendering pages"
        isCancelling={false}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText("Exporting")).toBeInTheDocument();
    expect(screen.getByText("Rendering pages")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("38");
    expect(screen.getByText("3 / 8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows zero percent with no total and disables cancel while cancelling", () => {
    render(
      <DeckPdfExportProgressModal
        isOpen
        title="Exporting"
        progress={3}
        total={0}
        phaseLabel={null}
        isCancelling
        onCancel={jest.fn()}
      />,
    );

    expect(screen.queryByText("Rendering pages")).not.toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("0");
    expect(screen.getByRole("button", { name: "Cancelling" })).toBeDisabled();
  });
});
