"use client";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { createRef, forwardRef } from "react";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";

let mockPreviewRenderer: "svg" | "webgl" = "svg";

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: forwardRef(function MockCardPreview(_props, _ref) {
    return <div>SVG_PREVIEW</div>;
  }),
}));

jest.mock("@/components/Cards/CardPreview/WebglPreview", () => ({
  __esModule: true,
  default: () => <div>WEBGL_PREVIEW</div>,
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: { hero: "card-1" },
    },
  }),
}));

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({
    showTextBounds: false,
  }),
}));

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    previewRenderer: mockPreviewRenderer,
    rotationResetToken: 0,
    recenterToken: 0,
  }),
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {},
    isDragging: false,
  }),
}));

jest.mock("@/components/Stockpile/stockpile-utils", () => ({
  waitForAssetElements: jest.fn(async () => undefined),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    language: "en",
    t: (key: string) => key,
  }),
}));

jest.mock("@/i18n/getTemplateNameLabel", () => ({
  getTemplateNameLabel: () => "Hero",
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listPairs: jest.fn(async () => []),
    getCard: jest.fn(async () => null),
    listCards: jest.fn(async () => []),
  },
}));

function HoverProbe() {
  const { hoveredTargetId, setHoveredTargetId } = useEditorTargets();

  return (
    <>
      <output data-testid="hovered-target">{hoveredTargetId ?? "none"}</output>
      <button
        type="button"
        onClick={() => setHoveredTargetId(EDITOR_TARGET_IDS.imageMain)}
      >
        hover-image
      </button>
    </>
  );
}

function Harness() {
  const form = useForm({
    defaultValues: {
      face: "front",
      title: "Sir Ragnar",
    },
  });

  return (
    <EditorTargetsProvider>
      <FormProvider {...form}>
        <HoverProbe />
        <CardPreviewContainer previewRef={createRef()} />
      </FormProvider>
    </EditorTargetsProvider>
  );
}

describe("CardPreviewContainer hover reset on renderer change", () => {
  beforeEach(() => {
    mockPreviewRenderer = "svg";
  });

  it("clears editor hover state when switching preview renderer modes", async () => {
    const { rerender } = render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "hover-image" }));
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);

    await act(async () => {
      mockPreviewRenderer = "webgl";
      rerender(<Harness />);
      await Promise.resolve();
    });
    expect(screen.getByTestId("hovered-target")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "hover-image" }));
    expect(screen.getByTestId("hovered-target")).toHaveTextContent(EDITOR_TARGET_IDS.imageMain);

    await act(async () => {
      mockPreviewRenderer = "svg";
      rerender(<Harness />);
      await Promise.resolve();
    });
    expect(screen.getByTestId("hovered-target")).toHaveTextContent("none");
  });
});
