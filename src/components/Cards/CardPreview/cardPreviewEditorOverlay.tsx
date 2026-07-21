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
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import { getCardPreviewStageLayout } from "./cardPreviewStage";
import {
  GIZMO_ARM_LENGTH_MAX,
  GIZMO_CENTER_HANDLE_HIT_RADIUS,
  GIZMO_CENTER_HANDLE_INNER_RADIUS,
  GIZMO_CENTER_HANDLE_RADIUS,
  GIZMO_FRAME_RADIUS,
  GIZMO_MOVE_HANDLE_HIT_RADIUS,
  GIZMO_ROTATION_SNAP_ANGLES,
  GIZMO_SCALE_EPSILON,
  GIZMO_TRANSFORM_HANDLE_HIT_RADIUS,
  GIZMO_TRANSFORM_HANDLE_RADIUS,
  getAngleDegrees,
  getArmEndpoint,
  getArmLengthForScale,
  getDistance,
  getScaleSnapRings,
  getSnappedRotation,
  getSnappedScale,
  normalizeShortestAngleDegrees,
  roundStageValue,
  type ScaleSnapRing,
} from "./cardPreviewGizmoMath";
import { getStagePointFromClientCoordinates } from "./cardPreviewPointer";

type CardPreviewEditorOverlayProps = {
  templateId?: TemplateId;
  cardData?: CardDataByTemplate[TemplateId];
};

const GIZMO_DARK_RING = "rgba(17, 24, 39, 0.82)";
const GIZMO_CYAN_FRAME = "rgba(34, 211, 238, 0.88)";
const GIZMO_CYAN_ACTIVE = "rgba(34, 211, 238, 1)";
const GIZMO_CYAN_STROKE = "rgba(34, 211, 238, 0.98)";
const GIZMO_CYAN_FILL = "rgba(34, 211, 238, 0.95)";
const GIZMO_SNAP_GUIDE = "rgba(34, 211, 238, 0.34)";
const GIZMO_FRAME_STROKE_WIDTH = 4;
const GIZMO_ARM_STROKE_WIDTH = 4;
const GIZMO_SNAP_GUIDE_STROKE_WIDTH = 3;
const GIZMO_SNAP_GUIDE_ACTIVE_STROKE_WIDTH = 4;
const GIZMO_MOVE_HANDLE_STROKE_WIDTH = 4;
const GIZMO_TRANSFORM_HANDLE_STROKE_WIDTH = 3;
const GIZMO_SNAP_RING_STROKE_WIDTH = 2;
const GIZMO_SNAP_RING_ACTIVE_STROKE_WIDTH = 4;

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
  const snapModifierActiveRef = useRef(false);
  const [activeDragMode, setActiveDragMode] = useState<DragState["mode"] | null>(null);
  const [snapModifierActive, setSnapModifierActive] = useState(false);
  const [activeSnapAngle, setActiveSnapAngle] = useState<number | null>(null);
  const [activeSnapScaleRatio, setActiveSnapScaleRatio] = useState<number | null>(null);

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

  const setSnapModifierState = (active: boolean) => {
    snapModifierActiveRef.current = active;
    setSnapModifierActive((previous) => (previous === active ? previous : active));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setSnapModifierState(event.altKey);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      setSnapModifierState(event.altKey);
    };
    const handleBlur = () => {
      setSnapModifierState(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  if (!canRenderGizmo || !frameBounds || !overlayGeometry || !form?.setValue) {
    return null;
  }

  const { setValue } = form;
  const transformDragState = activeDragMode === "transform" ? dragStateRef.current : null;
  const scaleSnapRings: ScaleSnapRing[] =
    transformDragState?.mode === "transform"
      ? getScaleSnapRings({
          startScale: transformDragState.startScale,
          startRadius: transformDragState.startPointerDistance,
          minScale: transformDragState.minScale,
          maxScale: transformDragState.maxScale,
        })
      : [];
  const snapGuideRadius = clamp(
    Math.max(
      Math.max(frameBounds.width, frameBounds.height) * 0.36,
      armLength + 24,
      scaleSnapRings.at(-1)?.radius ?? 0,
    ),
    armLength + 24,
    320,
  );

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
    setActiveSnapAngle(null);
    setActiveSnapScaleRatio(null);
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
    setSnapModifierState(event.altKey || snapModifierActiveRef.current);
    setActiveSnapAngle(null);
    setActiveSnapScaleRatio(null);
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
    snapActive: boolean,
  ) => {
    const currentAngle = getAngleDegrees(state.centerX, state.centerY, point.x, point.y);
    const currentDistance = Math.max(
      getDistance(state.centerX, state.centerY, point.x, point.y),
      GIZMO_SCALE_EPSILON,
    );
    const rotationDelta = normalizeShortestAngleDegrees(currentAngle - state.startPointerAngle);
    const freeRotation = roundStageValue(state.startRotation + rotationDelta);
    const snappedRotation = snapActive ? getSnappedRotation(freeRotation) : null;
    const nextRotation = snappedRotation?.rotation ?? freeRotation;
    const scaleRatio = currentDistance / Math.max(state.startPointerDistance, GIZMO_SCALE_EPSILON);
    const freeScale = clamp(state.startScale * scaleRatio, state.minScale, state.maxScale);
    const snappedScale = snapActive
      ? getSnappedScale({
          currentDistance,
          rings: getScaleSnapRings({
            startScale: state.startScale,
            startRadius: state.startPointerDistance,
            minScale: state.minScale,
            maxScale: state.maxScale,
          }),
        })
      : null;
    const nextScale = snappedScale?.scale ?? freeScale;
    setActiveSnapAngle(snappedRotation?.angle ?? null);
    setActiveSnapScaleRatio(snappedScale?.ratio ?? null);

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
    const snapActive =
      state.mode === "transform" ? event.altKey || snapModifierActiveRef.current : false;
    if (state.mode === "transform" && snapModifierActiveRef.current !== snapActive) {
      setSnapModifierState(snapActive);
    }
    const point = getStagePoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();

    if (state.mode === "move") {
      updateMoveDrag(state, point);
      return;
    }

    updateTransformDrag(state, point, snapActive);
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
    setActiveSnapAngle(null);
    setActiveSnapScaleRatio(null);
  };

  const armStroke = activeDragMode === "transform" ? GIZMO_CYAN_ACTIVE : GIZMO_CYAN_FRAME;
  const moveCursor = activeDragMode === "move" ? "grabbing" : "grab";
  const transformCursor = activeDragMode === "transform" ? "grabbing" : "grab";
  return (
    <g data-preview-only="editor-overlay" data-editor-overlay="true">
      {activeDragMode === "transform" && snapModifierActive ? (
        <g data-editor-image-snap-guides="true">
          {scaleSnapRings.map((ring) => {
            const isActive = activeSnapScaleRatio === ring.ratio;
            return (
              <circle
                key={`scale-ring-${ring.offset}`}
                cx={stageCenterX}
                cy={stageCenterY}
                r={ring.radius}
                fill="none"
                stroke={isActive ? GIZMO_CYAN_ACTIVE : GIZMO_SNAP_GUIDE}
                strokeWidth={isActive ? GIZMO_SNAP_RING_ACTIVE_STROKE_WIDTH : GIZMO_SNAP_RING_STROKE_WIDTH}
                pointerEvents="none"
                data-editor-image-snap-scale-ring={String(ring.ratio)}
                data-editor-image-snap-scale-ring-active={isActive ? "true" : "false"}
              />
            );
          })}
          {GIZMO_ROTATION_SNAP_ANGLES.map((angle) => {
            const endpoint = getArmEndpoint({
              centerX: stageCenterX,
              centerY: stageCenterY,
              rotationDeg: angle,
              armLength: snapGuideRadius,
            });
            const isActive = activeSnapAngle === angle;
            return (
              <line
                key={angle}
                x1={stageCenterX}
                y1={stageCenterY}
                x2={endpoint.x}
                y2={endpoint.y}
                stroke={isActive ? GIZMO_CYAN_ACTIVE : GIZMO_SNAP_GUIDE}
                strokeWidth={isActive ? GIZMO_SNAP_GUIDE_ACTIVE_STROKE_WIDTH : GIZMO_SNAP_GUIDE_STROKE_WIDTH}
                strokeLinecap="round"
                pointerEvents="none"
                data-editor-image-snap-angle={String(angle)}
                data-editor-image-snap-angle-active={isActive ? "true" : "false"}
              />
            );
          })}
        </g>
      ) : null}
      <rect
        x={x}
        y={y}
        width={frameBounds.width}
        height={frameBounds.height}
        rx={GIZMO_FRAME_RADIUS}
        ry={GIZMO_FRAME_RADIUS}
        fill="none"
        stroke={GIZMO_CYAN_FRAME}
        strokeWidth={GIZMO_FRAME_STROKE_WIDTH}
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
        strokeWidth={GIZMO_ARM_STROKE_WIDTH}
        strokeLinecap="round"
        pointerEvents="none"
        data-editor-image-arm="true"
      />
      <circle
        cx={stageCenterX}
        cy={stageCenterY}
        r={GIZMO_CENTER_HANDLE_RADIUS}
        fill={GIZMO_DARK_RING}
        stroke={GIZMO_CYAN_STROKE}
        strokeWidth={GIZMO_MOVE_HANDLE_STROKE_WIDTH}
        pointerEvents="none"
        data-editor-image-move-handle-visual="true"
      />
      <circle
        cx={stageCenterX}
        cy={stageCenterY}
        r={GIZMO_CENTER_HANDLE_INNER_RADIUS}
        fill={GIZMO_CYAN_FILL}
        pointerEvents="none"
      />
      <circle
        cx={armEnd.x}
        cy={armEnd.y}
        r={GIZMO_TRANSFORM_HANDLE_RADIUS}
        fill={GIZMO_CYAN_FILL}
        stroke={GIZMO_DARK_RING}
        strokeWidth={GIZMO_TRANSFORM_HANDLE_STROKE_WIDTH}
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
