"use client";

import { clamp } from "@/lib/math";

export const GIZMO_ARM_LENGTH_MIN = 64;
export const GIZMO_ARM_LENGTH_MAX = 240;
export const GIZMO_SCALE_EPSILON = 12;
export const GIZMO_FRAME_RADIUS = 16;
export const GIZMO_CENTER_HANDLE_RADIUS = 14;
export const GIZMO_CENTER_HANDLE_INNER_RADIUS = 5;
export const GIZMO_TRANSFORM_HANDLE_RADIUS = 10;
export const GIZMO_TRANSFORM_HANDLE_HIT_RADIUS = 16;
export const GIZMO_MOVE_HANDLE_HIT_RADIUS = 20;
export const GIZMO_ROTATION_SNAP_TOLERANCE_DEG = 6;
export const GIZMO_ROTATION_SNAP_ANGLES = [0, 90, 180, 270] as const;
export const GIZMO_SCALE_SNAP_STEP_RATIO = 0.25;
export const GIZMO_SCALE_SNAP_RING_OFFSETS = [-2, -1, 0, 1, 2] as const;
export const GIZMO_SCALE_SNAP_RADIUS_TOLERANCE = 8;

export function getArmBaseLengthForFrame(width: number, height: number) {
  return clamp(Math.max(width, height) * 0.14, GIZMO_ARM_LENGTH_MIN, 96);
}

export function getArmLengthForScale({
  frameWidth,
  frameHeight,
  scale,
  minScale,
  maxScale,
}: {
  frameWidth: number;
  frameHeight: number;
  scale: number;
  minScale: number;
  maxScale: number;
}) {
  const maxArmLength = clamp(Math.max(frameWidth, frameHeight) * 0.42, GIZMO_ARM_LENGTH_MIN, GIZMO_ARM_LENGTH_MAX);
  if (!Number.isFinite(scale)) {
    return getArmBaseLengthForFrame(frameWidth, frameHeight);
  }

  const baseArmLength = getArmBaseLengthForFrame(frameWidth, frameHeight);
  const clampedScale = Number.isFinite(minScale) && Number.isFinite(maxScale) && maxScale > minScale
    ? clamp(scale, minScale, maxScale)
    : Math.max(scale, 0);

  return clamp(baseArmLength * clampedScale, GIZMO_ARM_LENGTH_MIN, maxArmLength);
}

export function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function normalizeShortestAngleDegrees(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function getAngleDegrees(centerX: number, centerY: number, x: number, y: number) {
  return radiansToDegrees(Math.atan2(y - centerY, x - centerX));
}

export function getDistance(centerX: number, centerY: number, x: number, y: number) {
  return Math.hypot(x - centerX, y - centerY);
}

export function getArmEndpoint({
  centerX,
  centerY,
  rotationDeg,
  armLength,
}: {
  centerX: number;
  centerY: number;
  rotationDeg: number;
  armLength: number;
}) {
  const radians = degreesToRadians(rotationDeg);
  return {
    x: centerX + Math.cos(radians) * armLength,
    y: centerY + Math.sin(radians) * armLength,
  };
}

export function roundStageValue(value: number) {
  return Math.round(value * 100) / 100;
}

export function getSnappedRotation(
  rotation: number,
  tolerance: number = GIZMO_ROTATION_SNAP_TOLERANCE_DEG,
) {
  const snappedRotation = Math.round(rotation / 90) * 90;
  const delta = normalizeShortestAngleDegrees(rotation - snappedRotation);
  if (Math.abs(delta) > tolerance) {
    return null;
  }

  const snappedAngle =
    ((((snappedRotation % 360) + 360) % 360) as (typeof GIZMO_ROTATION_SNAP_ANGLES)[number]) || 0;

  return {
    rotation: snappedRotation,
    angle: snappedAngle,
  };
}

export type ScaleSnapRing = {
  offset: number;
  ratio: number;
  scale: number;
  radius: number;
};

export function getScaleSnapRings({
  startScale,
  startRadius,
  minScale,
  maxScale,
  offsets = GIZMO_SCALE_SNAP_RING_OFFSETS,
}: {
  startScale: number;
  startRadius: number;
  minScale: number;
  maxScale: number;
  offsets?: readonly number[];
}) {
  const rings: ScaleSnapRing[] = [];
  const seenScales = new Set<number>();

  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index];
    const ratio = roundStageValue(1 + offset * GIZMO_SCALE_SNAP_STEP_RATIO);
    if (!Number.isFinite(ratio) || ratio <= 0) continue;

    const scale = clamp(startScale * ratio, minScale, maxScale);
    const roundedScale = roundStageValue(scale);
    if (seenScales.has(roundedScale)) continue;
    seenScales.add(roundedScale);

    rings.push({
      offset,
      ratio,
      scale: roundedScale,
      radius: roundStageValue(startRadius * ratio),
    });
  }

  return rings.sort((left, right) => left.radius - right.radius);
}

export function getSnappedScale({
  currentDistance,
  rings,
  tolerance = GIZMO_SCALE_SNAP_RADIUS_TOLERANCE,
}: {
  currentDistance: number;
  rings: ScaleSnapRing[];
  tolerance?: number;
}) {
  let nearestRing: ScaleSnapRing | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (let index = 0; index < rings.length; index += 1) {
    const ring = rings[index];
    const delta = Math.abs(currentDistance - ring.radius);
    if (delta < nearestDelta) {
      nearestRing = ring;
      nearestDelta = delta;
    }
  }

  if (!nearestRing || nearestDelta > tolerance) {
    return null;
  }

  return nearestRing;
}
