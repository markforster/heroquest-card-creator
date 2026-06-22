import type { TemplateId } from "@/types/templates";
import type {
  BlueprintGroupTypeValue,
  BlueprintLayerTypeValue,
  BlueprintSlotId,
  SystemFamily,
} from "@/data/card-systems/types";

import type { StaticImageData } from "next/image";

export type BlueprintCanvas = {
  width: number;
  height: number;
};

export type BlueprintBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BlueprintLayerCondition = {
  hasText?: string;
  hasImage?: string;
};

export type BlueprintLayerBind = {
  textKey?: string;
  imageKey?: string;
  iconKey?: string;
  titleKey?: string;
};

export type BlueprintTextLayoutMode = "fixed-bounds" | "auto-height";

export type BlueprintLayerProps = Record<string, string | number | boolean> & {
  textLayoutMode?: BlueprintTextLayoutMode;
};

export type BlueprintLayerBase = {
  id: BlueprintSlotId;
  type: BlueprintLayerType;
  bounds?: BlueprintBounds;
  bind?: BlueprintLayerBind;
  when?: BlueprintLayerCondition;
  props?: BlueprintLayerProps;
};

export type BlueprintImageClip = "bounds" | "canvas" | "none";

export type BlueprintLayerBackground = BlueprintLayerBase & {
  type: "background";
  source?: "template" | "asset";
  asset?: StaticImageData;
  cutoutBounds?: BlueprintBounds;
  tintKey?: string;
};

export type BlueprintLayerBorder = BlueprintLayerBase & {
  type: "border";
  mask?: StaticImageData;
  texture?: StaticImageData;
  blendMode?: "multiply" | "overlay" | "screen";
  offsetX?: number;
  offsetY?: number;
};

export type BlueprintLayerOverlay = BlueprintLayerBase & {
  type: "overlay";
  asset: StaticImageData;
};

export type BlueprintLayerImage = BlueprintLayerBase & {
  type: "image";
  clip?: BlueprintImageClip;
};

export type BlueprintLayer =
  | BlueprintLayerBackground
  | BlueprintLayerBorder
  | BlueprintLayerOverlay
  | BlueprintLayerImage
  | BlueprintLayerBase;

export type BlueprintLayerType = BlueprintLayerTypeValue;

export type BlueprintGroup = {
  id: BlueprintSlotId;
  type: BlueprintGroupTypeValue;
  anchor: "bottom";
  direction: "up";
  origin: { x: number; y: number };
  width: number;
  gap: number;
  children: BlueprintLayer[];
};

export type Blueprint = {
  schemaVersion: 1;
  systemFamily: SystemFamily;
  templateId: TemplateId;
  canvas: BlueprintCanvas;
  layers: BlueprintLayer[];
  groups?: BlueprintGroup[];
};
