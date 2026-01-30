import type { TemplateId } from "@/types/templates";

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

export type BlueprintLayerBase = {
  id: string;
  type: BlueprintLayerType;
  bounds?: BlueprintBounds;
  bind?: BlueprintLayerBind;
  when?: BlueprintLayerCondition;
  props?: Record<string, string | number | boolean>;
};

export type BlueprintLayerBackground = BlueprintLayerBase & {
  type: "background";
  source?: "template" | "asset";
  asset?: StaticImageData;
};

export type BlueprintLayer =
  | BlueprintLayerBackground
  | BlueprintLayerBase;

export type BlueprintLayerType =
  | "background"
  | "image"
  | "text"
  | "title"
  | "overlay"
  | "icon"
  | "stats-hero"
  | "stats-monster";

export type BlueprintGroup = {
  id: string;
  type: "stack";
  anchor: "bottom";
  direction: "up";
  origin: { x: number; y: number };
  width: number;
  gap: number;
  children: BlueprintLayer[];
};

export type Blueprint = {
  schemaVersion: 1;
  templateId: TemplateId;
  canvas: BlueprintCanvas;
  layers: BlueprintLayer[];
  groups?: BlueprintGroup[];
};
