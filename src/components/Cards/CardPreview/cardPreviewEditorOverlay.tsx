"use client";

import {
  EDITOR_TARGET_IDS,
  useOptionalEditorTargets,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { resolveImageLayerOverlayGeometry } from "@/components/BlueprintRenderer/blueprintRendererImageGeometry";
import { ENABLE_EDITOR_TARGET_INTERACTIONS } from "@/config/flags";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import {
  computeImageZoomModel,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MAX,
  LEGACY_ABSOLUTE_IMAGE_SCALE_MIN,
} from "@/lib/image-scale";
import { clamp } from "@/lib/math";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

import { resolveMonsterIconOverlayGeometry } from "./cardPreviewIconGeometry";
import { CARD_HEIGHT, CARD_WIDTH, getCardPreviewStageLayout } from "./cardPreviewStage";
import {
  GIZMO_ARM_LENGTH_MAX,
  GIZMO_CENTER_HANDLE_INNER_RADIUS,
  GIZMO_CENTER_HANDLE_RADIUS,
  GIZMO_FRAME_RADIUS,
  GIZMO_MOVE_SNAP_INCREMENT,
  GIZMO_MOVE_HANDLE_HIT_RADIUS,
  GIZMO_ROTATION_SNAP_ANGLES,
  GIZMO_SCALE_EPSILON,
  GIZMO_TRANSFORM_HANDLE_HIT_RADIUS,
  GIZMO_TRANSFORM_HANDLE_RADIUS,
  getAnchoredGridLinePositions,
  getAngleDegrees,
  getArmEndpoint,
  getArmLengthForScale,
  getDistance,
  getScaleSnapRings,
  getSnappedOffset,
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
const GIZMO_MOVE_GRID_STROKE_WIDTH = 2;
const GIZMO_MOVE_GRID_ACCENT_STROKE_WIDTH = 2;
const GIZMO_MOVE_GRID_AXIS_STROKE_WIDTH = 3;
const GIZMO_MOVE_GRID_AXIS_STROKE = "rgba(236, 72, 153, 0.72)";
const GIZMO_MOVE_GRID_ACCENT_STROKE = "rgba(236, 72, 153, 0.5)";
const GIZMO_PIVOT_MARKER_STROKE = "rgba(236, 72, 153, 0.94)";
const GIZMO_PIVOT_MARKER_STROKE_WIDTH = 2;
const GIZMO_PIVOT_MARKER_RADIUS = 5;
const GIZMO_PIVOT_MARKER_CROSSHAIR_HALF = 10;
const GIZMO_MOVE_SNAP_HANDLE_FILL = "rgba(17, 24, 39, 0.24)";
const GIZMO_MOVE_SNAP_VISUAL_OFFSET_Y = 2.5;
const GIZMO_MOVE_GRID_MASK_RADIUS = 360;
const ICON_SCALE_MIN = 0.2;
const ICON_SCALE_MAX = 3;

type MainImageOverlayData = {
  imageAssetId?: string;
  imageScale?: number;
  imageScaleMode?: "absolute" | "relative";
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageRotation?: number;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
};

type MonsterIconOverlayData = {
  iconAssetId?: string;
  iconScale?: number;
  iconOffsetX?: number;
  iconOffsetY?: number;
  iconRotation?: number;
};

type ActiveTarget =
  | {
      kind: "main-image";
      targetId: typeof EDITOR_TARGET_IDS.imageMain;
      geometry: NonNullable<ReturnType<typeof resolveImageLayerOverlayGeometry>>;
      scale: number;
      rotation: number;
      scaleBounds: { min: number; max: number };
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "monster-icon";
      targetId: typeof EDITOR_TARGET_IDS.imageIcon;
      geometry: NonNullable<ReturnType<typeof resolveMonsterIconOverlayGeometry>>;
      scale: number;
      rotation: number;
      scaleBounds: { min: number; max: number };
      offsetX: number;
      offsetY: number;
    };

type DragState =
  | {
      mode: "move";
      targetKind: ActiveTarget["kind"];
      pointerId: number;
      startPointerX: number;
      startPointerY: number;
      startOffsetX: number;
      startOffsetY: number;
      startCenterX?: number;
      startCenterY?: number;
      baseCenterX?: number;
      baseCenterY?: number;
      minCenterX?: number;
      maxCenterX?: number;
      minCenterY?: number;
      maxCenterY?: number;
      horizontalTravel?: number;
      verticalTravel?: number;
    }
  | {
      mode: "transform";
      targetKind: ActiveTarget["kind"];
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
  const overlayId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const snapModifierActiveRef = useRef(false);
  const [activeDragMode, setActiveDragMode] = useState<DragState["mode"] | null>(null);
  const [snapModifierActive, setSnapModifierActive] = useState(false);
  const [activeSnapAngle, setActiveSnapAngle] = useState<number | null>(null);
  const [activeSnapScaleRatio, setActiveSnapScaleRatio] = useState<number | null>(null);

  const selectedTargetId = editorTargets?.selectedTargetId;
  const iconAssetId = (cardData as MonsterIconOverlayData | undefined)?.iconAssetId;
  const { width: iconImageWidth, height: iconImageHeight } = useAssetImageUrl(
    selectedTargetId === EDITOR_TARGET_IDS.imageIcon ? iconAssetId : undefined,
  );

  if (!ENABLE_EDITOR_TARGET_INTERACTIONS) {
    return null;
  }

  const blueprint = templateId ? blueprintsByTemplateId[templateId] : undefined;
  const imageLayer = blueprint?.layers.find((layer) => {
    return layer.type === layerTypes.image && layer.bind?.imageKey === "imageAssetId";
  });
  const imageData = (cardData as MainImageOverlayData | undefined) ?? {
    imageScale: 1,
    imageScaleMode: "relative",
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageRotation: 0,
  };
  const monsterIconData = (cardData as MonsterIconOverlayData | undefined) ?? {
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
    iconRotation: 0,
  };

  const mainImageScaleBounds = useMemo(() => {
    const imageBounds = imageLayer?.bounds;
    if (imageData.imageScaleMode === "relative" && imageBounds) {
      const zoomModel = computeImageZoomModel(
        imageBounds,
        imageData.imageOriginalWidth,
        imageData.imageOriginalHeight,
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
    imageData.imageOriginalHeight,
    imageData.imageOriginalWidth,
    imageData.imageScaleMode,
    imageLayer?.bounds,
  ]);

  const activeTarget: ActiveTarget | null = useMemo(() => {
    if (!blueprint || !form?.setValue) {
      return null;
    }

    if (selectedTargetId === EDITOR_TARGET_IDS.imageMain && imageLayer && imageData.imageAssetId) {
      const geometry = resolveImageLayerOverlayGeometry({
        blueprint,
        layer: imageLayer,
        cardData,
      });
      if (!geometry) {
        return null;
      }

      return {
        kind: "main-image",
        targetId: EDITOR_TARGET_IDS.imageMain,
        geometry,
        scale: imageData.imageScale ?? 1,
        rotation: imageData.imageRotation ?? 0,
        scaleBounds: mainImageScaleBounds,
        offsetX: imageData.imageOffsetX ?? 0,
        offsetY: imageData.imageOffsetY ?? 0,
      };
    }

    if (selectedTargetId === EDITOR_TARGET_IDS.imageIcon && monsterIconData.iconAssetId) {
      const geometry = resolveMonsterIconOverlayGeometry({
        blueprint,
        cardData,
        imageWidth: iconImageWidth,
        imageHeight: iconImageHeight,
      });
      if (!geometry) {
        return null;
      }

      return {
        kind: "monster-icon",
        targetId: EDITOR_TARGET_IDS.imageIcon,
        geometry,
        scale: monsterIconData.iconScale ?? 1,
        rotation: monsterIconData.iconRotation ?? 0,
        scaleBounds: {
          min: ICON_SCALE_MIN,
          max: ICON_SCALE_MAX,
        },
        offsetX: monsterIconData.iconOffsetX ?? 0,
        offsetY: monsterIconData.iconOffsetY ?? 0,
      };
    }

    return null;
  }, [
    blueprint,
    cardData,
    form?.setValue,
    iconImageHeight,
    iconImageWidth,
    imageData.imageAssetId,
    imageData.imageOffsetX,
    imageData.imageOffsetY,
    imageData.imageRotation,
    imageData.imageScale,
    imageLayer,
    mainImageScaleBounds,
    monsterIconData.iconAssetId,
    monsterIconData.iconOffsetX,
    monsterIconData.iconOffsetY,
    monsterIconData.iconRotation,
    monsterIconData.iconScale,
    selectedTargetId,
  ]);

  const layout = getCardPreviewStageLayout();
  const frameBounds = activeTarget?.geometry.frameBounds ?? null;
  const stageCenterX = activeTarget ? layout.cardOriginX + activeTarget.geometry.pivotX : 0;
  const stageCenterY = activeTarget ? layout.cardOriginY + activeTarget.geometry.pivotY : 0;
  const armLength = frameBounds
    ? getArmLengthForScale({
        frameWidth: frameBounds.width,
        frameHeight: frameBounds.height,
        scale: activeTarget?.scale ?? 1,
        minScale: activeTarget?.scaleBounds.min ?? 0,
        maxScale: activeTarget?.scaleBounds.max ?? GIZMO_ARM_LENGTH_MAX,
      })
    : GIZMO_ARM_LENGTH_MAX;
  const armEnd = getArmEndpoint({
    centerX: stageCenterX,
    centerY: stageCenterY,
    rotationDeg: activeTarget?.rotation ?? 0,
    armLength,
  });
  const x = frameBounds ? layout.cardOriginX + frameBounds.x : 0;
  const y = frameBounds ? layout.cardOriginY + frameBounds.y : 0;
  const canRenderGizmo = Boolean(activeTarget && frameBounds && form?.setValue);

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

  if (!canRenderGizmo || !activeTarget || !frameBounds || !form?.setValue) {
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
  const moveGridVerticalLines =
    activeDragMode === "move" && snapModifierActive
      ? getAnchoredGridLinePositions({
          stageStart: 0,
          stageEnd: layout.stageWidth,
          anchor: layout.cardOriginX + CARD_WIDTH / 2,
          increment: GIZMO_MOVE_SNAP_INCREMENT,
        })
      : [];
  const moveGridHorizontalLines =
    activeDragMode === "move" && snapModifierActive
      ? getAnchoredGridLinePositions({
          stageStart: 0,
          stageEnd: layout.stageHeight,
          anchor: layout.cardOriginY + CARD_HEIGHT / 2,
          increment: GIZMO_MOVE_SNAP_INCREMENT,
        })
      : [];
  const moveGridCenterX = layout.cardOriginX + CARD_WIDTH / 2;
  const moveGridCenterY = layout.cardOriginY + CARD_HEIGHT / 2;
  const isMoveSnapActive = activeDragMode === "move" && snapModifierActive;
  const moveSnapVisualCenterY = stageCenterY + GIZMO_MOVE_SNAP_VISUAL_OFFSET_Y;
  const moveGridAccentVerticalLines = moveGridVerticalLines.filter((lineX) => {
    const offsetIndex = Math.round((lineX - moveGridCenterX) / GIZMO_MOVE_SNAP_INCREMENT);
    return offsetIndex !== 0 && Math.abs(offsetIndex) % 10 === 0;
  });
  const moveGridAccentHorizontalLines = moveGridHorizontalLines.filter((lineY) => {
    const offsetIndex = Math.round((lineY - moveGridCenterY) / GIZMO_MOVE_SNAP_INCREMENT);
    return offsetIndex !== 0 && Math.abs(offsetIndex) % 10 === 0;
  });
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

    if (activeTarget.kind === "monster-icon") {
      dragStateRef.current = {
        mode: "move",
        targetKind: "monster-icon",
        pointerId: event.pointerId,
        startPointerX: point.x,
        startPointerY: point.y,
        startOffsetX: activeTarget.offsetX,
        startOffsetY: activeTarget.offsetY,
        startCenterX: stageCenterX,
        startCenterY: stageCenterY,
        baseCenterX: layout.cardOriginX + activeTarget.geometry.moveBounds.baseCenterX,
        baseCenterY: layout.cardOriginY + activeTarget.geometry.moveBounds.baseCenterY,
        minCenterX: layout.cardOriginX + activeTarget.geometry.moveBounds.minCenterX,
        maxCenterX: layout.cardOriginX + activeTarget.geometry.moveBounds.maxCenterX,
        minCenterY: layout.cardOriginY + activeTarget.geometry.moveBounds.minCenterY,
        maxCenterY: layout.cardOriginY + activeTarget.geometry.moveBounds.maxCenterY,
        horizontalTravel: activeTarget.geometry.moveBounds.horizontalTravel,
        verticalTravel: activeTarget.geometry.moveBounds.verticalTravel,
      };
    } else {
      dragStateRef.current = {
        mode: "move",
        targetKind: "main-image",
        pointerId: event.pointerId,
        startPointerX: point.x,
        startPointerY: point.y,
        startOffsetX: activeTarget.offsetX,
        startOffsetY: activeTarget.offsetY,
      };
    }

    setActiveDragMode("move");
    setSnapModifierState(event.altKey || snapModifierActiveRef.current);
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
      targetKind: activeTarget.kind,
      pointerId: event.pointerId,
      centerX: stageCenterX,
      centerY: stageCenterY,
      startPointerAngle: getAngleDegrees(stageCenterX, stageCenterY, point.x, point.y),
      startPointerDistance: Math.max(
        getDistance(stageCenterX, stageCenterY, point.x, point.y),
        GIZMO_SCALE_EPSILON,
      ),
      startRotation: activeTarget.rotation,
      startScale: activeTarget.scale,
      minScale: activeTarget.scaleBounds.min,
      maxScale: activeTarget.scaleBounds.max,
    };
    setActiveDragMode("transform");
    setSnapModifierState(event.altKey || snapModifierActiveRef.current);
    setActiveSnapAngle(null);
    setActiveSnapScaleRatio(null);
  };

  const updateMoveDrag = (
    state: Extract<DragState, { mode: "move" }>,
    point: { x: number; y: number },
    snapActive: boolean,
  ) => {
    if (state.targetKind === "main-image") {
      const freeOffsetX = roundStageValue(state.startOffsetX + (point.x - state.startPointerX));
      const freeOffsetY = roundStageValue(state.startOffsetY + (point.y - state.startPointerY));
      const nextOffsetX = snapActive ? getSnappedOffset(freeOffsetX) : freeOffsetX;
      const nextOffsetY = snapActive ? getSnappedOffset(freeOffsetY) : freeOffsetY;

      setValue("imageOffsetX", nextOffsetX, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setValue("imageOffsetY", nextOffsetY, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }

    const startCenterX = state.startCenterX ?? stageCenterX;
    const startCenterY = state.startCenterY ?? stageCenterY;
    const desiredCenterX = roundStageValue(startCenterX + (point.x - state.startPointerX));
    const desiredCenterY = roundStageValue(startCenterY + (point.y - state.startPointerY));
    const snappedCenterX = snapActive
      ? moveGridCenterX + getSnappedOffset(desiredCenterX - moveGridCenterX)
      : desiredCenterX;
    const snappedCenterY = snapActive
      ? moveGridCenterY + getSnappedOffset(desiredCenterY - moveGridCenterY)
      : desiredCenterY;
    const clampedCenterX = clamp(
      snappedCenterX,
      state.minCenterX ?? snappedCenterX,
      state.maxCenterX ?? snappedCenterX,
    );
    const clampedCenterY = clamp(
      snappedCenterY,
      state.minCenterY ?? snappedCenterY,
      state.maxCenterY ?? snappedCenterY,
    );
    const nextOffsetX =
      (state.horizontalTravel ?? 0) > 0
        ? roundStageValue(
            clamp(
              (clampedCenterX - (state.baseCenterX ?? clampedCenterX)) /
                (state.horizontalTravel ?? 1),
              0,
              1,
            ),
          )
        : 0;
    const nextOffsetY =
      (state.verticalTravel ?? 0) > 0
        ? roundStageValue(
            clamp(
              ((state.baseCenterY ?? clampedCenterY) - clampedCenterY) /
                (state.verticalTravel ?? 1),
              0,
              1,
            ),
          )
        : 0;

    setValue("iconOffsetX", nextOffsetX, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("iconOffsetY", nextOffsetY, {
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

    if (state.targetKind === "main-image") {
      setValue("imageRotation", nextRotation, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setValue("imageScale", nextScale, {
        shouldDirty: true,
        shouldTouch: true,
      });
      return;
    }

    setValue("iconRotation", nextRotation, {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue("iconScale", nextScale, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const snapActive = event.altKey || snapModifierActiveRef.current;
    if (snapModifierActiveRef.current !== snapActive) {
      setSnapModifierState(snapActive);
    }
    const point = getStagePoint(event);
    if (!point) return;
    event.stopPropagation();
    event.preventDefault();

    if (state.mode === "move") {
      updateMoveDrag(state, point, snapActive);
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
  const armStart = isMoveSnapActive
    ? getArmEndpoint({
        centerX: stageCenterX,
        centerY: stageCenterY,
        rotationDeg: activeTarget.rotation,
        armLength: GIZMO_CENTER_HANDLE_RADIUS,
      })
    : { x: stageCenterX, y: stageCenterY };
  const visualArmStartY = isMoveSnapActive
    ? armStart.y + GIZMO_MOVE_SNAP_VISUAL_OFFSET_Y
    : armStart.y;
  const visualArmEndY = isMoveSnapActive ? armEnd.y + GIZMO_MOVE_SNAP_VISUAL_OFFSET_Y : armEnd.y;
  const visualTransformHandleY = isMoveSnapActive
    ? armEnd.y + GIZMO_MOVE_SNAP_VISUAL_OFFSET_Y
    : armEnd.y;
  const moveGridGradientId = `editor-image-move-grid-gradient-${overlayId}`;
  const moveGridMaskId = `editor-image-move-grid-mask-${overlayId}`;

  return (
    <g
      data-preview-only="editor-overlay"
      data-editor-overlay="true"
      data-editor-image-target={activeTarget.targetId}
    >
      {isMoveSnapActive ? (
        <>
          <defs data-editor-image-move-grid-defs="true">
            <radialGradient
              id={moveGridGradientId}
              gradientUnits="userSpaceOnUse"
              cx={stageCenterX}
              cy={moveSnapVisualCenterY}
              r={GIZMO_MOVE_GRID_MASK_RADIUS}
              data-editor-image-move-grid-gradient="true"
            >
              <stop offset="0%" stopColor="white" stopOpacity="0.94" />
              <stop offset="72%" stopColor="white" stopOpacity="0.82" />
              <stop offset="90%" stopColor="white" stopOpacity="0.28" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask
              id={moveGridMaskId}
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={layout.stageWidth}
              height={layout.stageHeight}
              data-editor-image-move-grid-mask="true"
            >
              <rect
                x={0}
                y={0}
                width={layout.stageWidth}
                height={layout.stageHeight}
                fill={`url(#${moveGridGradientId})`}
              />
            </mask>
          </defs>
          <g data-editor-image-move-grid="true" mask={`url(#${moveGridMaskId})`}>
            {moveGridVerticalLines.map((lineX) => (
              <line
                key={`move-grid-v-${lineX}`}
                x1={lineX}
                y1={0}
                x2={lineX}
                y2={layout.stageHeight}
                stroke={lineX === moveGridCenterX ? GIZMO_MOVE_GRID_AXIS_STROKE : GIZMO_SNAP_GUIDE}
                strokeWidth={
                  lineX === moveGridCenterX
                    ? GIZMO_MOVE_GRID_AXIS_STROKE_WIDTH
                    : GIZMO_MOVE_GRID_STROKE_WIDTH
                }
                pointerEvents="none"
                data-editor-image-move-grid-line="vertical"
                data-editor-image-move-grid-position={String(lineX)}
                data-editor-image-move-grid-axis={lineX === moveGridCenterX ? "true" : "false"}
              />
            ))}
            {moveGridHorizontalLines.map((lineY) => (
              <line
                key={`move-grid-h-${lineY}`}
                x1={0}
                y1={lineY}
                x2={layout.stageWidth}
                y2={lineY}
                stroke={lineY === moveGridCenterY ? GIZMO_MOVE_GRID_AXIS_STROKE : GIZMO_SNAP_GUIDE}
                strokeWidth={
                  lineY === moveGridCenterY
                    ? GIZMO_MOVE_GRID_AXIS_STROKE_WIDTH
                    : GIZMO_MOVE_GRID_STROKE_WIDTH
                }
                pointerEvents="none"
                data-editor-image-move-grid-line="horizontal"
                data-editor-image-move-grid-position={String(lineY)}
                data-editor-image-move-grid-axis={lineY === moveGridCenterY ? "true" : "false"}
              />
            ))}
            {moveGridAccentVerticalLines.map((lineX) => (
              <line
                key={`move-grid-accent-v-${lineX}`}
                x1={lineX}
                y1={0}
                x2={lineX}
                y2={layout.stageHeight}
                stroke={GIZMO_MOVE_GRID_ACCENT_STROKE}
                strokeWidth={GIZMO_MOVE_GRID_ACCENT_STROKE_WIDTH}
                pointerEvents="none"
                data-editor-image-move-grid-accent-line="vertical"
                data-editor-image-move-grid-accent-position={String(lineX)}
              />
            ))}
            {moveGridAccentHorizontalLines.map((lineY) => (
              <line
                key={`move-grid-accent-h-${lineY}`}
                x1={0}
                y1={lineY}
                x2={layout.stageWidth}
                y2={lineY}
                stroke={GIZMO_MOVE_GRID_ACCENT_STROKE}
                strokeWidth={GIZMO_MOVE_GRID_ACCENT_STROKE_WIDTH}
                pointerEvents="none"
                data-editor-image-move-grid-accent-line="horizontal"
                data-editor-image-move-grid-accent-position={String(lineY)}
              />
            ))}
          </g>
        </>
      ) : null}
      {isMoveSnapActive ? (
        <g data-editor-image-pivot-marker="true" pointerEvents="none">
          <line
            x1={stageCenterX - GIZMO_PIVOT_MARKER_CROSSHAIR_HALF}
            y1={moveSnapVisualCenterY}
            x2={stageCenterX + GIZMO_PIVOT_MARKER_CROSSHAIR_HALF}
            y2={moveSnapVisualCenterY}
            stroke={GIZMO_PIVOT_MARKER_STROKE}
            strokeWidth={GIZMO_PIVOT_MARKER_STROKE_WIDTH}
            strokeLinecap="round"
            data-editor-image-pivot-marker-axis="horizontal"
          />
          <line
            x1={stageCenterX}
            y1={moveSnapVisualCenterY - GIZMO_PIVOT_MARKER_CROSSHAIR_HALF}
            x2={stageCenterX}
            y2={moveSnapVisualCenterY + GIZMO_PIVOT_MARKER_CROSSHAIR_HALF}
            stroke={GIZMO_PIVOT_MARKER_STROKE}
            strokeWidth={GIZMO_PIVOT_MARKER_STROKE_WIDTH}
            strokeLinecap="round"
            data-editor-image-pivot-marker-axis="vertical"
          />
          <circle
            cx={stageCenterX}
            cy={moveSnapVisualCenterY}
            r={GIZMO_PIVOT_MARKER_RADIUS}
            fill="none"
            stroke={GIZMO_PIVOT_MARKER_STROKE}
            strokeWidth={GIZMO_PIVOT_MARKER_STROKE_WIDTH}
          />
        </g>
      ) : null}
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
                strokeWidth={
                  isActive ? GIZMO_SNAP_RING_ACTIVE_STROKE_WIDTH : GIZMO_SNAP_RING_STROKE_WIDTH
                }
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
                strokeWidth={
                  isActive ? GIZMO_SNAP_GUIDE_ACTIVE_STROKE_WIDTH : GIZMO_SNAP_GUIDE_STROKE_WIDTH
                }
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
        x1={armStart.x}
        y1={visualArmStartY}
        x2={armEnd.x}
        y2={visualArmEndY}
        stroke={armStroke}
        strokeWidth={GIZMO_ARM_STROKE_WIDTH}
        strokeLinecap="round"
        pointerEvents="none"
        data-editor-image-arm="true"
      />
      <circle
        cx={stageCenterX}
        cy={isMoveSnapActive ? moveSnapVisualCenterY : stageCenterY}
        r={GIZMO_CENTER_HANDLE_RADIUS}
        fill={isMoveSnapActive ? GIZMO_MOVE_SNAP_HANDLE_FILL : GIZMO_DARK_RING}
        stroke={GIZMO_CYAN_STROKE}
        strokeWidth={GIZMO_MOVE_HANDLE_STROKE_WIDTH}
        pointerEvents="none"
        data-editor-image-move-handle-visual="true"
      />
      {isMoveSnapActive ? null : (
        <circle
          cx={stageCenterX}
          cy={stageCenterY}
          r={GIZMO_CENTER_HANDLE_INNER_RADIUS}
          fill={GIZMO_CYAN_FILL}
          pointerEvents="none"
          data-editor-image-move-handle-inner-dot="true"
        />
      )}
      <circle
        cx={armEnd.x}
        cy={visualTransformHandleY}
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
