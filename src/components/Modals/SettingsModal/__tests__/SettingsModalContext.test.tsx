jest.mock("@/i18n/I18nProvider", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    onConfirm,
    onCancel,
    onExtra,
    children,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onExtra?: () => void;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        {children}
        <button type="button" onClick={onConfirm}>
          discard
        </button>
        <button type="button" onClick={onCancel}>
          cancel
        </button>
        {onExtra ? (
          <button type="button" onClick={onExtra}>
            save
          </button>
        ) : null}
      </div>
    ) : null,
}));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  SettingsModalProvider,
  SettingsPanelProvider,
  useSettingsModalControls,
  useSettingsPanel,
} from "@/components/Modals/SettingsModal/SettingsModalContext";

function PanelHarness({
  onBeforeClose,
  onSave,
}: {
  onBeforeClose: () => void;
  onSave: () => void;
}) {
  const panel = useSettingsPanel();
  const controls = useSettingsModalControls();
  return (
    <div>
      <button type="button" onClick={() => panel.setBlocked(true, "Unsaved")}>
        block
      </button>
      <button type="button" onClick={() => panel.setBlocked(false)}>
        unblock
      </button>
      <button type="button" onClick={() => panel.setBeforeClose(onBeforeClose)}>
        before
      </button>
      <button type="button" onClick={() => panel.setSaveHandler(onSave)}>
        handler
      </button>
      <button type="button" onClick={() => panel.requestClose()}>
        close
      </button>
      <button type="button" onClick={() => panel.requestAreaChange("advanced")}>
        switch
      </button>
      <output data-testid="can-close">{String(controls.canClose())}</output>
    </div>
  );
}

function renderSettings() {
  const onClose = jest.fn();
  const onAreaChange = jest.fn();
  const onBeforeClose = jest.fn();
  const onSave = jest.fn();
  render(
    <SettingsModalProvider onClose={onClose} onAreaChange={onAreaChange}>
      <SettingsPanelProvider panelId="general" label="General">
        <PanelHarness onBeforeClose={onBeforeClose} onSave={onSave} />
      </SettingsPanelProvider>
    </SettingsModalProvider>,
  );
  return { onClose, onAreaChange, onBeforeClose, onSave };
}

describe("SettingsModalContext", () => {
  it("runs before-close handlers and closes immediately when unblocked", async () => {
    const { onClose, onBeforeClose } = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "before" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onBeforeClose).toHaveBeenCalled();
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("requires confirmation before discarding a blocked panel", async () => {
    const { onClose } = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "block" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(screen.getByTestId("confirm-modal")).toHaveTextContent(
      "confirm.discardSettingsChangesPanel",
    );
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent.click(screen.getByRole("button", { name: "discard" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("runs a blocked panel save handler before closing", async () => {
    const { onClose, onSave } = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "handler" }));
    fireEvent.click(screen.getByRole("button", { name: "block" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("switches areas immediately or after blocked confirmation", async () => {
    const { onAreaChange } = renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "switch" }));
    expect(onAreaChange).toHaveBeenCalledWith("advanced");

    fireEvent.click(screen.getByRole("button", { name: "block" }));
    fireEvent.click(screen.getByRole("button", { name: "switch" }));
    fireEvent.click(screen.getByRole("button", { name: "discard" }));
    await waitFor(() => expect(onAreaChange).toHaveBeenCalledTimes(2));
  });
});
