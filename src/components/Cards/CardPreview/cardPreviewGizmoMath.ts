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
