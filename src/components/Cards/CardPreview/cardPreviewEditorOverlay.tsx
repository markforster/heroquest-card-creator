"use client";

import {
  EDITOR_TARGET_IDS,
  useOptionalEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { resolveImageLayerOverlayGeometry } from "@/components/BlueprintRenderer/blueprintRendererImageGeometry";
import { ENABLE_EDITOR_TARGET_INTERACTIONS } from "@/config/flags";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import {
  computeImageZoomModel,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
} from "@/lib/image-scale";
import { clamp } from "@/lib/math";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";
import { useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import { getCardPreviewStageLayout } from "./cardPreviewStage";
import {
  GIZMO_ARM_LENGTH_MAX,
  GIZMO_CENTER_HANDLE_HIT_RADIUS,
  GIZMO_CENTER_HANDLE_INNER_RADIUS,
  GIZMO_CENTER_HANDLE_RADIUS,
  GIZMO_FRAME_RADIUS,
  GIZMO_MOVE_HANDLE_HIT_RADIUS,
  GIZMO_SCALE_EPSILON,
  GIZMO_TRANSFORM_HANDLE_HIT_RADIUS,
  GIZMO_TRANSFORM_HANDLE_RADIUS,
  getAngleDegrees,
  getArmEndpoint,
  getArmLengthForScale,
  getDistance,
  normalizeShortestAngleDegrees,
  roundStageValue,
} from "./cardPreviewGizmoMath";
import { getStagePointFromClientCoordinates } from "./cardPreviewPointer";

type CardPreviewEditorOverlayProps = {
  templateId?: TemplateId;
  cardData?: CardDataByTemplate[TemplateId];
};

type DragState =
  | {
      mode: "move";
      pointerId: number;
      startPointerX: number;
      startPointerY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      mode: "transform";
      pointerId: number;
      centerX: number;
      centerY: number;
      startPointerAngle: number;
      startPointerDistance: number;
      startRotation: number;
      startScale: number;
      minScale: number;
      maxScale: number;
    };

export default function CardPreviewEditorOverlay({
  templateId,
  cardData,
}: CardPreviewEditorOverlayProps) {
  const form = useFormContext() as ReturnType<typeof useFormContext> | null;
  const editorTargets = useOptionalEditorTargets();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragMode, setActiveDragMode] = useState<DragState["mode"] | null>(null);

  if (!ENABLE_EDITOR_TARGET_INTERACTIONS) {
    return null;
  }

  const isImageSelected = editorTargets?.selectedTargetId === EDITOR_TARGET_IDS.imageMain;
  const blueprint = templateId ? blueprintsByTemplateId[templateId] : undefined;
  const imageLayer = blueprint?.layers.find((layer) => {
    return layer.type === layerTypes.image && layer.bind?.imageKey === "imageAssetId";
  });
  const imageAssetId = (cardData as { imageAssetId?: string } | undefined)?.imageAssetId;
  const data = (cardData as {
    imageScale?: number;
    imageScaleMode?: "absolute" | "relative";
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageRotation?: number;
    imageOriginalWidth?: number;
    imageOriginalHeight?: number;
  }) ?? {
    imageScale: 1,
    imageScaleMode: "relative",
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageRotation: 0,
  };

  const scaleBounds = useMemo(() => {
    const imageBounds = imageLayer?.bounds;
    if (data.imageScaleMode === "relative" && imageBounds) {
      const zoomModel = computeImageZoomModel(
        imageBounds,
        data.imageOriginalWidth,
        data.imageOriginalHeight,
      );
      return {
        min: zoomModel.relativeMin,
        max: zoomModel.relativeMax,
      };
    }
    return {
      min: LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
      max: LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
    };
  }, [
    data.imageOriginalHeight,
    data.imageOriginalWidth,
    data.imageScaleMode,
    imageLayer?.bounds,
  ]);
  const overlayGeometry =
    blueprint && imageLayer
      ? resolveImageLayerOverlayGeometry({
          blueprint,
          layer: imageLayer,
          cardData,
        })
      : null;
  const layout = getCardPreviewStageLayout();
  const frameBounds = overlayGeometry?.frameBounds ?? null;
  const stageCenterX =
    overlayGeometry ? layout.cardOriginX + overlayGeometry.centerX : 0;
  const stageCenterY =
    overlayGeometry ? layout.cardOriginY + overlayGeometry.centerY : 0;
  const armLength = frameBounds
    ? getArmLengthForScale({
        frameWidth: frameBounds.width,
        frameHeight: frameBounds.height,
        scale: data.imageScale ?? 1,
        minScale: scaleBounds.min,
        maxScale: scaleBounds.max,
      })
    : GIZMO_ARM_LENGTH_MAX;
  const armEnd = getArmEndpoint({
    centerX: stageCenterX,
    centerY: stageCenterY,
    rotationDeg: overlayGeometry?.rotation ?? 0,
    armLength,
  });
  const x = frameBounds ? layout.cardOriginX + frameBounds.x : 0;
  const y = frameBounds ? layout.cardOriginY + frameBounds.y : 0;
  const canRenderGizmo =
    isImageSelected &&
    Boolean(templateId && blueprint && imageLayer && imageAssetId && overlayGeometry && form?.setValue);

  if (!canRenderGizmo || !frameBounds || !overlayGeometry || !form?.setValue) {
    return null;
  }

  const { setValue } = form;

  const getStagePoint = (event: React.PointerEvent<SVGCircleElement>) => {
    const svg = svgRef.current ?? event.currentTarget.ownerSVGElement;
    if (!svg) return null;
    svgRef.current = svg;
    return getStagePointFromClientCoordinates({
      svg,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const beginMoveDrag = (event: React.PointerEvent<SVGCircleElement>) => {
    const point = getStagePoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startPointerX: point.x,
      startPointerY: point.y,
      startOffsetX: data.imageOffsetX ?? 0,
      startOffsetY: data.imageOffsetY ?? 0,
    };
    setActiveDragMode("move");
  };

  const beginTransformDrag = (event: React.PointerEvent<SVGCircleElement>) => {
    const point = getStagePoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      mode: "transform",
      pointerId: event.pointerId,
      centerX: stageCenterX,
      centerY: stageCenterY,
      startPointerAngle: getAngleDegrees(stageCenterX, stageCenterY, point.x, point.y),
      startPointerDistance: Math.max(
        getDistance(stageCenterX, stageCenterY, point.x, point.y),
        GIZMO_SCALE_EPSILON,
      ),
      startRotation: data.imageRotation ?? 0,
      startScale: data.imageScale ?? 1,
      minScale: scaleBounds.min,
      maxScale: scaleBounds.max,
    };
    setActiveDragMode("transform");
  };

  const updateMoveDrag = (state: Extract<DragState, { mode: "move" }>, point: { x: number; y: number }) => {
    setValue("imageOffsetX", roundStageValue(state.startOffsetX + (point.x - state.startPointerX)), {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("imageOffsetY", roundStageValue(state.startOffsetY + (point.y - state.startPointerY)), {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const updateTransformDrag = (
    state: Extract<DragState, { mode: "transform" }>,
    point: { x: number; y: number },
  ) => {
    const currentAngle = getAngleDegrees(state.centerX, state.centerY, point.x, point.y);
    const currentDistance = Math.max(
      getDistance(state.centerX, state.centerY, point.x, point.y),
      GIZMO_SCALE_EPSILON,
    );
    const rotationDelta = normalizeShortestAngleDegrees(currentAngle - state.startPointerAngle);
    const nextRotation = roundStageValue(state.startRotation + rotationDelta);
    const scaleRatio = currentDistance / Math.max(state.startPointerDistance, GIZMO_SCALE_EPSILON);
    const nextScale = clamp(state.startScale * scaleRatio, state.minScale, state.maxScale);

    setValue("imageRotation", nextRotation, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("imageScale", nextScale, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const point = getStagePoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();

    if (state.mode === "move") {
      updateMoveDrag(state, point);
      return;
    }

    updateTransformDrag(state, point);
  };

  const endDrag = (event: React.PointerEvent<SVGCircleElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setActiveDragMode(null);
  };

  const armStroke = activeDragMode === "transform" ? "rgba(245, 158, 11, 1)" : "rgba(245, 158, 11, 0.88)";
  const moveCursor = activeDragMode === "move" ? "grabbing" : "grab";
  const transformCursor = activeDragMode === "transform" ? "grabbing" : "grab";

  return (
    <g data-preview-only="editor-overlay" data-editor-overlay="true">
      <rect
        x={x}
        y={y}
        width={frameBounds.width}
        height={frameBounds.height}
        rx={GIZMO_FRAME_RADIUS}
        ry={GIZMO_FRAME_RADIUS}
        fill="none"
        stroke="rgba(245, 158, 11, 0.88)"
        strokeWidth={3}
        strokeDasharray="10 8"
        pointerEvents="none"
        data-editor-image-frame="true"
      />
      <line
        x1={stageCenterX}
        y1={stageCenterY}
        x2={armEnd.x}
        y2={armEnd.y}
        stroke={armStroke}
        strokeWidth={3}
        strokeLinecap="round"
        pointerEvents="none"
        data-editor-image-arm="true"
      />
      <circle
        cx={stageCenterX}
        cy={stageCenterY}
        r={GIZMO_CENTER_HANDLE_RADIUS}
        fill="rgba(17, 24, 39, 0.82)"
        stroke="rgba(245, 158, 11, 0.98)"
        strokeWidth={3}
        pointerEvents="none"
        data-editor-image-move-handle-visual="true"
      />
      <circle
        cx={stageCenterX}
        cy={stageCenterY}
        r={GIZMO_CENTER_HANDLE_INNER_RADIUS}
        fill="rgba(245, 158, 11, 0.95)"
        pointerEvents="none"
      />
      <circle
        cx={armEnd.x}
        cy={armEnd.y}
        r={GIZMO_TRANSFORM_HANDLE_RADIUS}
        fill="rgba(245, 158, 11, 0.95)"
        stroke="rgba(17, 24, 39, 0.82)"
        strokeWidth={2}
        pointerEvents="none"
        data-editor-image-transform-handle-visual="true"
      />
      <circle
        cx={stageCenterX}
        cy={stageCenterY}
        r={GIZMO_MOVE_HANDLE_HIT_RADIUS}
        fill="transparent"
        style={{ cursor: moveCursor }}
        onPointerDown={beginMoveDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-editor-image-move-handle="true"
      />
      <circle
        cx={armEnd.x}
        cy={armEnd.y}
        r={GIZMO_TRANSFORM_HANDLE_HIT_RADIUS}
        fill="transparent"
        style={{ cursor: transformCursor }}
        onPointerDown={beginTransformDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-editor-image-transform-handle="true"
      />
    </g>
  );
}
