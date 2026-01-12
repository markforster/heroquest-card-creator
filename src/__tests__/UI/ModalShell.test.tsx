import { fireEvent, render, screen } from "@testing-library/react";

import ModalShell from "@/components/ModalShell";
import { I18nProvider } from "@/i18n/I18nProvider";

describe("ModalShell", () => {
  function getBackdrop(): HTMLElement {
    // Body is rendered inside: .modal-body -> .templatePopover -> .templatePopoverBackdrop
    const body = screen.getByText("Body").closest(".modal-body");
    if (!body) {
      throw new Error("Expected .modal-body wrapper");
    }
    const panel = body.parentElement;
    if (!panel) {
      throw new Error("Expected modal panel wrapper");
    }
    const backdrop = panel.parentElement;
    if (!backdrop) {
      throw new Error("Expected backdrop wrapper");
    }
    return backdrop;
  }

  it("renders nothing when closed", () => {
    render(
      <I18nProvider>
        <ModalShell isOpen={false} title="Title" onClose={() => {}}>
          Body
        </ModalShell>
      </I18nProvider>,
    );

    expect(screen.queryByText("Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("renders title, body, headerActions and footer when open", () => {
    render(
      <I18nProvider>
        <ModalShell
          isOpen
          title="My Modal"
          onClose={() => {}}
          headerActions={<button type="button">Extra</button>}
          footer={<div>Footer</div>}
        >
          <div>Body</div>
        </ModalShell>
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "My Modal" })).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("calls onClose when clicking the backdrop", () => {
    const onClose = jest.fn();
    render(
      <I18nProvider>
        <ModalShell isOpen title="Modal" onClose={onClose}>
          Body
        </ModalShell>
      </I18nProvider>,
    );

    fireEvent.click(getBackdrop());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the panel", () => {
    const onClose = jest.fn();
    render(
      <I18nProvider>
        <ModalShell isOpen title="Modal" onClose={onClose}>
          <div>Body</div>
        </ModalShell>
      </I18nProvider>,
    );

    fireEvent.click(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = jest.fn();
    render(
      <I18nProvider>
        <ModalShell isOpen title="Modal" onClose={onClose}>
          Body
        </ModalShell>
      </I18nProvider>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
