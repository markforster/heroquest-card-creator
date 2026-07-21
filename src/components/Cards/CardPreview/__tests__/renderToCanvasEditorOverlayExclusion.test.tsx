import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { resolveImageLayerOverlayGeometry } from "@/components/BlueprintRenderer/blueprintRendererImageGeometry";
import CardPreview from "@/components/Cards/CardPreview";
import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import {
  getArmEndpoint,
  getArmLengthForScale,
} from "@/components/Cards/CardPreview/cardPreviewGizmoMath";
import { getCardPreviewStageLayout } from "@/components/Cards/CardPreview/cardPreviewStage";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import { computeImageZoomModel } from "@/lib/image-scale";

const capturedOverlayPresence: boolean[] = [];
const mockGetStagePointFromClientCoordinates = jest.fn();
const selectedPreviewData = {
  title: "Hero",
  imageAssetId: "asset-1",
  imageOriginalWidth: 1400,
  imageOriginalHeight: 1800,
  imageScale: 1,
  imageScaleMode: "relative" as const,
  imageOffsetX: 0,
  imageOffsetY: 0,
  imageRotation: 0,
};

jest.mock("@/components/BlueprintRenderer", () => ({
  __esModule: true,
  default: () => <g data-testid="blueprint-renderer" />,
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  __esModule: true,
  useCopyrightSettings: () => ({
    defaultCopyright: "",
    isReady: true,
  }),
}));

jest.mock("@/components/Providers/LocalStorageProvider", () => ({
  __esModule: true,
  useLocalStorageBoolean: () => [false],
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Cards/CardPreview/cardPreviewPointer", () => ({
  __esModule: true,
  getStagePointFromClientCoordinates: (args: {
    clientX: number;
    clientY: number;
  }) => mockGetStagePointFromClientCoordinates(args),
}));

jest.mock("@/lib/render-svg-to-canvas", () => ({
  __esModule: true,
  renderSvgToCanvas: jest.fn(
    async ({
      svgElement,
      mutateSvg,
    }: {
      svgElement: SVGSVGElement;
      mutateSvg?: (svg: SVGSVGElement) => void;
    }) => {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      mutateSvg?.(clonedSvg);
      capturedOverlayPresence.push(Boolean(clonedSvg.querySelector('[data-editor-image-frame="true"]')));
      const canvas = document.createElement("canvas");
      canvas.toBlob = ((callback: BlobCallback) => {
        callback(new Blob(["png"], { type: "image/png" }));
      }) as HTMLCanvasElement["toBlob"];
      return canvas;
    },
  ),
}));

describe("CardPreview renderToCanvas", () => {
  const originalImage = global.Image;
  const originalSetPointerCapture = SVGElement.prototype.setPointerCapture;
  const originalReleasePointerCapture = SVGElement.prototype.releasePointerCapture;
  const originalHasPointerCapture = SVGElement.prototype.hasPointerCapture;

  function SelectImageMainTarget() {
    const { setSelectedTargetId } = useEditorTargets();

    useEffect(() => {
      setSelectedTargetId(EDITOR_TARGET_IDS.imageMain);
    }, [setSelectedTargetId]);

    return null;
  }

  function FormValueProbe() {
    const values = useWatch({
      name: ["imageOffsetX", "imageOffsetY", "imageRotation", "imageScale"],
    }) as [number | undefined, number | undefined, number | undefined, number | undefined];

    return (
      <output
        data-testid="form-values"
        data-offset-x={values[0] ?? ""}
        data-offset-y={values[1] ?? ""}
        data-rotation={values[2] ?? ""}
        data-scale={values[3] ?? ""}
      />
    );
  }

  function PreviewFormHarness({
    children,
    defaultValues,
  }: {
    children: React.ReactNode;
    defaultValues: Record<string, unknown>;
  }) {
    const form = useForm({ defaultValues });
    return (
      <FormProvider {...form}>
        {children}
        <FormValueProbe />
      </FormProvider>
    );
  }

  beforeEach(() => {
    capturedOverlayPresence.length = 0;
    mockGetStagePointFromClientCoordinates.mockReset();

    SVGElement.prototype.setPointerCapture = jest.fn();
    SVGElement.prototype.releasePointerCapture = jest.fn();
    SVGElement.prototype.hasPointerCapture = jest.fn(() => true);

    class InstantImage {
      private listeners = new Map<string, EventListener[]>();

      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
      }

      removeEventListener(type: string, listener: EventListener) {
        this.listeners.set(
          type,
          (this.listeners.get(type) ?? []).filter((entry) => entry !== listener),
        );
      }

      set src(_value: string) {
        queueMicrotask(() => {
          (this.listeners.get("load") ?? []).forEach((listener) => listener(new Event("load")));
        });
      }
    }

    global.Image = InstantImage as unknown as typeof Image;
  });

  afterEach(() => {
    global.Image = originalImage;
    SVGElement.prototype.setPointerCapture = originalSetPointerCapture;
    SVGElement.prototype.releasePointerCapture = originalReleasePointerCapture;
    SVGElement.prototype.hasPointerCapture = originalHasPointerCapture;
  });

  function setSvgRect(svg: SVGSVGElement) {
    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          left: 0,
          top: 0,
          width: 756,
          height: 1056,
          right: 756,
          bottom: 1056,
          x: 0,
          y: 0,
          toJSON: () => undefined,
        }) satisfies DOMRect,
    });
  }

  function getSelectedPreviewStageGeometry() {
    const blueprint = blueprintsByTemplateId.hero;
    const imageLayer = blueprint.layers.find((layer) => {
      return layer.type === layerTypes.image && layer.bind?.imageKey === "imageAssetId";
    });
    if (!imageLayer) {
      throw new Error("Expected hero image layer");
    }
    const overlayGeometry = resolveImageLayerOverlayGeometry({
      blueprint,
      layer: imageLayer,
      cardData: selectedPreviewData,
    });
    if (!overlayGeometry) {
      throw new Error("Expected overlay geometry");
    }

    const layout = getCardPreviewStageLayout();
    const centerX = layout.cardOriginX + overlayGeometry.centerX;
    const centerY = layout.cardOriginY + overlayGeometry.centerY;
    const zoomModel = computeImageZoomModel(
      imageLayer.bounds,
      selectedPreviewData.imageOriginalWidth,
      selectedPreviewData.imageOriginalHeight,
    );
    const armEnd = getArmEndpoint({
      centerX,
      centerY,
      rotationDeg: overlayGeometry.rotation,
      armLength: getArmLengthForScale({
        frameWidth: overlayGeometry.frameBounds.width,
        frameHeight: overlayGeometry.frameBounds.height,
        scale: selectedPreviewData.imageScale,
        minScale: zoomModel.relativeMin,
        maxScale: zoomModel.relativeMax,
      }),
    });

    return {
      centerX,
      centerY,
      armEndX: armEnd.x,
      armEndY: armEnd.y,
    };
  }

  async function renderSelectedPreview() {
    const ref = createRef<CardPreviewHandle>();

    await act(async () => {
      render(
        <EditorTargetsProvider>
          <SelectImageMainTarget />
          <PreviewFormHarness
            defaultValues={selectedPreviewData}
          >
            <CardPreview
              ref={ref}
              templateId="hero"
              templateName="Hero"
              cardData={selectedPreviewData}
            />
          </PreviewFormHarness>
        </EditorTargetsProvider>,
      );
      await Promise.resolve();
    });

    const svg = document.querySelector("svg");
    if (!(svg instanceof SVGSVGElement)) {
      throw new Error("Expected preview svg");
    }
    setSvgRect(svg);

    return {
      ref,
      svg,
      values: () => screen.getByTestId("form-values"),
      moveHandle: () => {
        const handle = document.querySelector('[data-editor-image-move-handle="true"]');
        if (!(handle instanceof SVGElement)) {
          throw new Error("Expected move handle");
        }
        return handle;
      },
      transformHandle: () => {
        const handle = document.querySelector('[data-editor-image-transform-handle="true"]');
        if (!(handle instanceof SVGElement)) {
          throw new Error("Expected transform handle");
        }
        return handle;
      },
      snapGuides: () => document.querySelector('[data-editor-image-snap-guides="true"]'),
      activeSnapGuide: () =>
        document.querySelector('[data-editor-image-snap-angle-active="true"]'),
    };
  }

  function getTransformDragPoints(angleDeg: number, radiusMultiplier: number = 1) {
    const { centerX, centerY, armEndX, armEndY } = getSelectedPreviewStageGeometry();
    const startRadius = Math.hypot(armEndX - centerX, armEndY - centerY);
    const radians = (angleDeg * Math.PI) / 180;
    return {
      startX: armEndX,
      startY: armEndY,
      endX: centerX + Math.cos(radians) * startRadius * radiusMultiplier,
      endY: centerY + Math.sin(radians) * startRadius * radiusMultiplier,
    };
  }

  it("omits preview-only editor overlay nodes from canvas renders", async () => {
    const { ref } = await renderSelectedPreview();

    await act(async () => {
      await ref.current?.renderToCanvas();
    });

    expect(capturedOverlayPresence).toEqual([false]);
  });

  it("updates image offsets while dragging the move handle", async () => {
    const { moveHandle, values } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 24, y: centerY - 18 });

    await act(async () => {
      fireEvent.pointerDown(handle, {
        pointerId: 1,
      });
      fireEvent.pointerMove(handle, {
        pointerId: 1,
      });
      fireEvent.pointerUp(handle, {
        pointerId: 1,
      });
    });

    expect(values()).toHaveAttribute("data-offset-x", "24");
    expect(values()).toHaveAttribute("data-offset-y", "-18");
    expect(values()).toHaveAttribute("data-rotation", "0");
    expect(values()).toHaveAttribute("data-scale", "1");
  });

  it("updates image rotation and scale while dragging the transform handle", async () => {
    const { moveHandle, transformHandle, values } = await renderSelectedPreview();
    moveHandle();
    const outerHandle = transformHandle();
    const { centerX, centerY, armEndX, armEndY } = getSelectedPreviewStageGeometry();
    const startX = armEndX;
    const startY = armEndY;
    const deltaX = startX - centerX;
    const deltaY = startY - centerY;
    const endStageX = centerX - deltaY * 1.4;
    const endStageY = centerY + deltaX * 1.4;
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endStageX, y: endStageY });

    await act(async () => {
      fireEvent.pointerDown(outerHandle, {
        pointerId: 2,
      });
      fireEvent.pointerMove(outerHandle, {
        pointerId: 2,
      });
      fireEvent.pointerUp(outerHandle, {
        pointerId: 2,
      });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(90, 4);
    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.4, 4);
    expect(values()).toHaveAttribute("data-offset-x", "0");
    expect(values()).toHaveAttribute("data-offset-y", "0");
  });

  it("keeps free rotation when the snap modifier is not held", async () => {
    const { transformHandle, values, snapGuides } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(84);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 3 });
      fireEvent.pointerMove(handle, { pointerId: 3, altKey: false });
      fireEvent.pointerUp(handle, { pointerId: 3, altKey: false });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(84, 4);
    expect(snapGuides()).toBeNull();
  });

  it("snaps rotation to a cardinal angle when the snap modifier is held within tolerance", async () => {
    const { transformHandle, values, snapGuides, activeSnapGuide } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(84);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 4, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 4, altKey: true });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(90, 4);
    expect(snapGuides()).not.toBeNull();
    expect(activeSnapGuide()).toHaveAttribute("data-editor-image-snap-angle", "90");
  });

  it("does not snap rotation when outside the snap tolerance", async () => {
    const { transformHandle, values, snapGuides, activeSnapGuide } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(80);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 5, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 5, altKey: true });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(80, 4);
    expect(snapGuides()).not.toBeNull();
    expect(activeSnapGuide()).toBeNull();
  });

  it("enables snap when the modifier is pressed during an active transform drag", async () => {
    const { transformHandle, values, activeSnapGuide } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(84);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 6, altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 6, altKey: false });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(84, 4);

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 6, altKey: true });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(90, 4);
    expect(activeSnapGuide()).toHaveAttribute("data-editor-image-snap-angle", "90");
  });

  it("returns to free rotation when the modifier is released during an active transform drag", async () => {
    const { transformHandle, values, activeSnapGuide } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(84);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 7, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 7, altKey: true });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(90, 4);
    expect(activeSnapGuide()).toHaveAttribute("data-editor-image-snap-angle", "90");

    await act(async () => {
      fireEvent.keyUp(window, { key: "Alt", altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 7, altKey: false });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(84, 4);
    expect(activeSnapGuide()).toBeNull();
  });

  it("does not show polar snap guides during move drags even when the modifier is held", async () => {
    const { moveHandle, snapGuides } = await renderSelectedPreview();
    const handle = moveHandle();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 12, y: centerY + 8 });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 8, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 8, altKey: true });
    });

    expect(snapGuides()).toBeNull();
  });
});
