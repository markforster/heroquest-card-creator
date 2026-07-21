import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useMemo } from "react";
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
  GIZMO_CENTER_HANDLE_RADIUS,
  GIZMO_MOVE_SNAP_INCREMENT,
  getArmEndpoint,
  getArmLengthForScale,
} from "@/components/Cards/CardPreview/cardPreviewGizmoMath";
import { CARD_HEIGHT, CARD_WIDTH, getCardPreviewStageLayout } from "@/components/Cards/CardPreview/cardPreviewStage";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import { computeImageZoomModel } from "@/lib/image-scale";
import type { CardDataByTemplate } from "@/types/card-data";

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

  function WatchedCardPreview({
    previewRef,
    templateId,
    templateName,
  }: {
    previewRef: React.RefObject<CardPreviewHandle | null>;
    templateId: "hero";
    templateName: string;
  }) {
    const values = useWatch() as CardDataByTemplate["hero"];
    const cardData = useMemo(() => values, [values]);

    return (
      <CardPreview
        ref={previewRef}
        templateId={templateId}
        templateName={templateName}
        cardData={cardData}
      />
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
    const centerX = layout.cardOriginX + overlayGeometry.pivotX;
    const centerY = layout.cardOriginY + overlayGeometry.pivotY;
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
      frameCenterX: layout.cardOriginX + overlayGeometry.centerX,
      frameCenterY: layout.cardOriginY + overlayGeometry.centerY,
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
            <WatchedCardPreview previewRef={ref} templateId="hero" templateName="Hero" />
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
      moveGrid: () => document.querySelector('[data-editor-image-move-grid="true"]'),
      moveGridMask: () => document.querySelector('[data-editor-image-move-grid-mask="true"]'),
      moveGridGradient: () =>
        document.querySelector('[data-editor-image-move-grid-gradient="true"]'),
      moveGridLines: () => document.querySelectorAll('[data-editor-image-move-grid-line]'),
      moveGridAxes: () => document.querySelectorAll('[data-editor-image-move-grid-axis="true"]'),
      moveGridAccentLines: () =>
        document.querySelectorAll('[data-editor-image-move-grid-accent-line]'),
      pivotMarker: () => document.querySelector('[data-editor-image-pivot-marker="true"]'),
      pivotMarkerAxes: () =>
        document.querySelectorAll('[data-editor-image-pivot-marker-axis]'),
      arm: () => document.querySelector('[data-editor-image-arm="true"]'),
      moveHandleInnerDot: () =>
        document.querySelector('[data-editor-image-move-handle-inner-dot="true"]'),
      transformHandleVisual: () =>
        document.querySelector('[data-editor-image-transform-handle-visual="true"]'),
      scaleSnapRings: () => document.querySelectorAll('[data-editor-image-snap-scale-ring]'),
      activeScaleSnapRing: () =>
        document.querySelector('[data-editor-image-snap-scale-ring-active="true"]'),
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

  it("uses the true rendered image pivot instead of the clipped frame center", () => {
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
      cardData: {
        ...selectedPreviewData,
        imageScale: 2.2,
        imageOffsetX: -180,
        imageOffsetY: 36,
        imageRotation: 18,
      },
    });
    if (!overlayGeometry) {
      throw new Error("Expected overlay geometry");
    }

    expect(overlayGeometry.centerX).not.toBeCloseTo(overlayGeometry.pivotX, 4);
    expect(overlayGeometry.centerY).not.toBeCloseTo(overlayGeometry.pivotY, 4);
  });

  it("keeps free move offsets when the snap modifier is not held", async () => {
    const { moveHandle, values, moveGrid } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 14, altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 14, altKey: false });
    });

    expect(values()).toHaveAttribute("data-offset-x", "25");
    expect(values()).toHaveAttribute("data-offset-y", "-17");
    expect(moveGrid()).toBeNull();
  });

  it("snaps move offsets to the nearest 12 units when the modifier is held", async () => {
    const {
      moveHandle,
      values,
      moveGrid,
      moveGridMask,
      moveGridGradient,
      pivotMarker,
      pivotMarkerAxes,
      moveGridAccentLines,
      moveHandleInnerDot,
    } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 15, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 15, altKey: true });
    });

    expect(values()).toHaveAttribute("data-offset-x", "24");
    expect(values()).toHaveAttribute("data-offset-y", "-12");
    expect(moveGrid()).not.toBeNull();
    expect(moveGrid()).toHaveAttribute("mask");
    expect(moveGridMask()).not.toBeNull();
    expect(moveGridGradient()).not.toBeNull();
    expect(moveGridAccentLines().length).toBeGreaterThan(0);
    expect(pivotMarker()).not.toBeNull();
    expect(pivotMarkerAxes()).toHaveLength(2);
    expect(moveHandleInnerDot()).toBeNull();
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

  it("shows the move grid only during move drags with the modifier held", async () => {
    const { moveHandle, moveGrid, moveGridMask, moveGridGradient } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 12, y: centerY + 8 });

    expect(moveGrid()).toBeNull();

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 16, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 16, altKey: true });
    });

    expect(moveGrid()).not.toBeNull();
    expect(moveGridMask()).not.toBeNull();
    expect(moveGridGradient()).not.toBeNull();
  });

  it("enables move snap when the modifier is pressed during an active move drag", async () => {
    const { moveHandle, values, moveGrid } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 17, altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 17, altKey: false });
    });

    expect(values()).toHaveAttribute("data-offset-x", "25");
    expect(values()).toHaveAttribute("data-offset-y", "-17");

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 17, altKey: true });
    });

    expect(values()).toHaveAttribute("data-offset-x", "24");
    expect(values()).toHaveAttribute("data-offset-y", "-12");
    expect(moveGrid()).not.toBeNull();
  });

  it("returns to free move offsets when the modifier is released during an active move drag", async () => {
    const { moveHandle, values, moveGrid } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 18, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 18, altKey: true });
    });

    expect(values()).toHaveAttribute("data-offset-x", "24");
    expect(values()).toHaveAttribute("data-offset-y", "-12");
    expect(moveGrid()).not.toBeNull();

    await act(async () => {
      fireEvent.keyUp(window, { key: "Alt", altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 18, altKey: false });
    });

    expect(values()).toHaveAttribute("data-offset-x", "25");
    expect(values()).toHaveAttribute("data-offset-y", "-17");
    expect(moveGrid()).toBeNull();
  });

  it("keeps move grid lines anchored while the image offset changes", async () => {
    const {
      moveHandle,
      moveGridLines,
      moveGridAxes,
      moveGridGradient,
      moveGridAccentLines,
    } =
      await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 24, y: centerY - 12 })
      .mockReturnValueOnce({ x: centerX + 48, y: centerY - 24 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 19, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 19, altKey: true });
    });

    const firstPositions = Array.from(moveGridLines()).map((line) =>
      line.getAttribute("data-editor-image-move-grid-position"),
    );

    await act(async () => {
      fireEvent.pointerMove(handle, { pointerId: 19, altKey: true });
    });

    const secondPositions = Array.from(moveGridLines()).map((line) =>
      line.getAttribute("data-editor-image-move-grid-position"),
    );
    const accentLines = Array.from(moveGridAccentLines());
    const accentPositions = accentLines.map((line) =>
      line.getAttribute("data-editor-image-move-grid-accent-position"),
    );

    expect(secondPositions).toEqual(firstPositions);
    expect(moveGridGradient()).toHaveAttribute("cx", String(centerX + 48));
    expect(moveGridGradient()).toHaveAttribute("cy", String(centerY - 21.5));

    const axisPositions = Array.from(moveGridAxes()).map((line) => ({
      orientation: line.getAttribute("data-editor-image-move-grid-line"),
      position: line.getAttribute("data-editor-image-move-grid-position"),
    }));
    const layout = getCardPreviewStageLayout();

    expect(axisPositions).toEqual([
      {
        orientation: "vertical",
        position: String(layout.cardOriginX + CARD_WIDTH / 2),
      },
      {
        orientation: "horizontal",
        position: String(layout.cardOriginY + CARD_HEIGHT / 2),
      },
    ]);
    const axisPositionValues = axisPositions.map((entry) => entry.position);
    const expectedAccentPositions = secondPositions.filter((position) => {
      if (!position || axisPositionValues.includes(position)) {
        return false;
      }
      const numericPosition = Number(position);
      const axisPosition =
        numericPosition === Number(axisPositionValues[0]) ||
        numericPosition === Number(axisPositionValues[1])
          ? numericPosition
          : null;
      const anchor =
        Math.abs(numericPosition - Number(axisPositionValues[0])) %
          GIZMO_MOVE_SNAP_INCREMENT ===
        0
          ? Number(axisPositionValues[0])
          : Number(axisPositionValues[1]);
      const offsetIndex = Math.round(
        (numericPosition - anchor) / GIZMO_MOVE_SNAP_INCREMENT,
      );
      return offsetIndex !== 0 && Math.abs(offsetIndex) % 10 === 0;
    });
    expect(accentPositions).toEqual(expectedAccentPositions);
  });

  it("keeps the move handle aligned to the snapped grid intersection", async () => {
    const { moveHandle, values, pivotMarker, arm } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 21, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 21, altKey: true });
    });

    expect(values()).toHaveAttribute("data-offset-x", "24");
    expect(values()).toHaveAttribute("data-offset-y", "-12");
    expect(handle).toHaveAttribute("cx", String(centerX + 24));
    expect(handle).toHaveAttribute("cy", String(centerY - 12));

    const marker = pivotMarker();
    if (!(marker instanceof SVGElement)) {
      throw new Error("Expected pivot marker");
    }

    const markerCircle = marker.querySelector("circle");
    if (!(markerCircle instanceof Element)) {
      throw new Error("Expected pivot marker circle");
    }

    expect(markerCircle).toHaveAttribute("cx", String(centerX + 24));
    expect(markerCircle).toHaveAttribute("cy", String(centerY - 9.5));

    const armLine = arm();
    if (!(armLine instanceof SVGElement)) {
      throw new Error("Expected move arm");
    }

    expect(Number(armLine.getAttribute("x1"))).toBeCloseTo(centerX + 24 + GIZMO_CENTER_HANDLE_RADIUS, 4);
    expect(Number(armLine.getAttribute("y1"))).toBeCloseTo(centerY - 9.5, 4);
    expect(Number(armLine.getAttribute("y2"))).toBeCloseTo(centerY - 9.5, 4);
  });

  it("nudges the move-snap visual center slightly below the snapped y coordinate", async () => {
    const { moveHandle, pivotMarker, transformHandleVisual, arm } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 25, y: centerY - 17 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 23, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 23, altKey: true });
    });

    expect(handle).toHaveAttribute("cx", String(centerX + 24));
    expect(handle).toHaveAttribute("cy", String(centerY - 12));

    const marker = pivotMarker();
    if (!(marker instanceof SVGElement)) {
      throw new Error("Expected pivot marker");
    }

    const markerCircle = marker.querySelector("circle");
    if (!(markerCircle instanceof Element)) {
      throw new Error("Expected pivot marker circle");
    }

    expect(markerCircle).toHaveAttribute("cx", String(centerX + 24));
    expect(markerCircle).toHaveAttribute("cy", String(centerY - 9.5));
    expect(Number(markerCircle.getAttribute("cy"))).toBeCloseTo(
      Number(handle.getAttribute("cy")) + 2.5,
      4,
    );

    const transformVisual = transformHandleVisual();
    if (!(transformVisual instanceof SVGElement)) {
      throw new Error("Expected transform handle visual");
    }

    expect(Number(transformVisual.getAttribute("cy"))).toBeCloseTo(centerY - 9.5, 4);

    const armLine = arm();
    if (!(armLine instanceof SVGElement)) {
      throw new Error("Expected move arm");
    }

    expect(Number(armLine.getAttribute("y1"))).toBeCloseTo(centerY - 9.5, 4);
    expect(Number(armLine.getAttribute("y2"))).toBeCloseTo(centerY - 9.5, 4);
  });

  it("keeps the transform arm centered and inner dot visible outside move-snap mode", async () => {
    const { transformHandle, arm, moveHandleInnerDot } = await renderSelectedPreview();
    const { centerX, centerY, armEndX, armEndY } = getSelectedPreviewStageGeometry();
    const handle = transformHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: armEndX, y: armEndY })
      .mockReturnValueOnce({ x: armEndX, y: armEndY });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 22, altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 22, altKey: false });
    });

    const armLine = arm();
    if (!(armLine instanceof SVGElement)) {
      throw new Error("Expected transform arm");
    }

    expect(armLine).toHaveAttribute("x1", String(centerX));
    expect(armLine).toHaveAttribute("y1", String(centerY));
    expect(moveHandleInnerDot()).not.toBeNull();
  });

  it("emphasizes exactly one vertical and one horizontal center axis in the move grid", async () => {
    const { moveHandle, moveGridAxes, moveGridAccentLines } = await renderSelectedPreview();
    const { centerX, centerY } = getSelectedPreviewStageGeometry();
    const handle = moveHandle();
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: centerX, y: centerY })
      .mockReturnValueOnce({ x: centerX + 24, y: centerY - 12 });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 20, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 20, altKey: true });
    });

    const axes = Array.from(moveGridAxes());
    const verticalAxes = axes.filter(
      (line) => line.getAttribute("data-editor-image-move-grid-line") === "vertical",
    );
    const horizontalAxes = axes.filter(
      (line) => line.getAttribute("data-editor-image-move-grid-line") === "horizontal",
    );

    expect(verticalAxes).toHaveLength(1);
    expect(horizontalAxes).toHaveLength(1);
    expect(verticalAxes[0]).toHaveAttribute("stroke-width", "3");
    expect(horizontalAxes[0]).toHaveAttribute("stroke-width", "3");
    const accents = Array.from(moveGridAccentLines());
    expect(accents.length).toBeGreaterThan(0);
    expect(accents[0]).toHaveAttribute("stroke-width", "2");
  });

  it("snaps scale to the nearest relative ring when the modifier is held within tolerance", async () => {
    const { transformHandle, values, scaleSnapRings, activeScaleSnapRing } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(0, 1.24);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 9, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 9, altKey: true });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.25, 4);
    expect(scaleSnapRings().length).toBeGreaterThan(0);
    expect(activeScaleSnapRing()).toHaveAttribute("data-editor-image-snap-scale-ring", "1.25");
  });

  it("does not snap scale when outside the ring tolerance", async () => {
    const { transformHandle, values, scaleSnapRings, activeScaleSnapRing } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(0, 1.12);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 10, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 10, altKey: true });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.12, 4);
    expect(scaleSnapRings().length).toBeGreaterThan(0);
    expect(activeScaleSnapRing()).toBeNull();
  });

  it("enables scale snap when the modifier is pressed during an active transform drag", async () => {
    const { transformHandle, values, activeScaleSnapRing } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(0, 1.12);
    const snappedPoints = getTransformDragPoints(0, 1.24);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY })
      .mockReturnValueOnce({ x: snappedPoints.endX, y: snappedPoints.endY });

    await act(async () => {
      fireEvent.pointerDown(handle, { pointerId: 11, altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 11, altKey: false });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.12, 4);

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 11, altKey: true });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.25, 4);
    expect(activeScaleSnapRing()).toHaveAttribute("data-editor-image-snap-scale-ring", "1.25");
  });

  it("returns to free scale when the modifier is released during an active transform drag", async () => {
    const { transformHandle, values, activeScaleSnapRing } = await renderSelectedPreview();
    const handle = transformHandle();
    const snappedPoints = getTransformDragPoints(0, 1.24);
    const freePoints = getTransformDragPoints(0, 1.12);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: snappedPoints.startX, y: snappedPoints.startY })
      .mockReturnValueOnce({ x: snappedPoints.endX, y: snappedPoints.endY })
      .mockReturnValueOnce({ x: freePoints.endX, y: freePoints.endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 12, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 12, altKey: true });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.25, 4);
    expect(activeScaleSnapRing()).toHaveAttribute("data-editor-image-snap-scale-ring", "1.25");

    await act(async () => {
      fireEvent.keyUp(window, { key: "Alt", altKey: false });
      fireEvent.pointerMove(handle, { pointerId: 12, altKey: false });
    });

    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.12, 4);
    expect(activeScaleSnapRing()).toBeNull();
  });

  it("snaps rotation and scale together when both guides are engaged", async () => {
    const { transformHandle, values, activeSnapGuide, activeScaleSnapRing } = await renderSelectedPreview();
    const handle = transformHandle();
    const { startX, startY, endX, endY } = getTransformDragPoints(84, 1.24);
    mockGetStagePointFromClientCoordinates
      .mockReturnValueOnce({ x: startX, y: startY })
      .mockReturnValueOnce({ x: endX, y: endY });

    await act(async () => {
      fireEvent.keyDown(window, { key: "Alt", altKey: true });
      fireEvent.pointerDown(handle, { pointerId: 13, altKey: true });
      fireEvent.pointerMove(handle, { pointerId: 13, altKey: true });
    });

    expect(Number(values().getAttribute("data-rotation"))).toBeCloseTo(90, 4);
    expect(Number(values().getAttribute("data-scale"))).toBeCloseTo(1.25, 4);
    expect(activeSnapGuide()).toHaveAttribute("data-editor-image-snap-angle", "90");
    expect(activeScaleSnapRing()).toHaveAttribute("data-editor-image-snap-scale-ring", "1.25");
  });
});
