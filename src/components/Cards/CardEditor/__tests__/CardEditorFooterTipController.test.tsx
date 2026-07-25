"use client";

import { fireEvent, render, screen } from "@testing-library/react";

import CardEditorFooterTipController from "@/components/Cards/CardEditor/CardEditorFooterTipController";
import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";

const mockSetTip = jest.fn();
const mockClearTip = jest.fn();

jest.mock("@/components/Providers/FooterTipContext", () => ({
  __esModule: true,
  useFooterTip: () => ({
    currentTip: null,
    setTip: mockSetTip,
    clearTip: mockClearTip,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) =>
      key === "hint.cardEditorImageTransformPrecision"
        ? "Hold Option / Alt for precision move, rotate, and scale."
        : key,
  }),
}));

function TargetSelectionButtons() {
  const { setSelectedTargetId } = useEditorTargets();

  return (
    <>
      <button type="button" onClick={() => setSelectedTargetId(EDITOR_TARGET_IDS.imageMain)}>
        select-image-main
      </button>
      <button type="button" onClick={() => setSelectedTargetId(EDITOR_TARGET_IDS.imageIcon)}>
        select-image-icon
      </button>
      <button type="button" onClick={() => setSelectedTargetId(EDITOR_TARGET_IDS.title)}>
        select-title
      </button>
      <button type="button" onClick={() => setSelectedTargetId(null)}>
        clear-selection
      </button>
    </>
  );
}

function renderHarness() {
  return render(
    <EditorTargetsProvider>
      <CardEditorFooterTipController />
      <TargetSelectionButtons />
    </EditorTargetsProvider>,
  );
}

describe("CardEditorFooterTipController", () => {
  beforeEach(() => {
    mockSetTip.mockClear();
    mockClearTip.mockClear();
  });

  it("does not publish a tip when no target is selected", () => {
    renderHarness();

    expect(mockSetTip).not.toHaveBeenCalled();
    expect(mockClearTip).toHaveBeenCalledWith("card-editor-image-transform");
  });

  it("publishes the tip for the main image target", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "select-image-main" }));

    expect(mockSetTip).toHaveBeenLastCalledWith(
      "card-editor-image-transform",
      "Hold Option / Alt for precision move, rotate, and scale.",
      "lightbulb",
    );
  });

  it("publishes the tip for the monster icon target", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "select-image-icon" }));

    expect(mockSetTip).toHaveBeenLastCalledWith(
      "card-editor-image-transform",
      "Hold Option / Alt for precision move, rotate, and scale.",
      "lightbulb",
    );
  });

  it("clears the tip when selection moves to a non-image target", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "select-image-main" }));
    fireEvent.click(screen.getByRole("button", { name: "select-title" }));

    expect(mockClearTip).toHaveBeenLastCalledWith("card-editor-image-transform");
  });

  it("clears the tip when selection becomes null", () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "select-image-icon" }));
    fireEvent.click(screen.getByRole("button", { name: "clear-selection" }));

    expect(mockClearTip).toHaveBeenLastCalledWith("card-editor-image-transform");
  });
});
