import type { BlueprintBounds } from "@/types/blueprints";

export const IMAGE_CLIP_EDGE_BOTTOM = 1 << 0;
export const IMAGE_CLIP_EDGE_TOP = 1 << 1;
export const IMAGE_CLIP_EDGE_LEFT = 1 << 2;
export const IMAGE_CLIP_EDGE_RIGHT = 1 << 3;

export type ImageClipEdgeControlSettings = {
  adjustableClipEdgeMask: number;
  bottomMin: number;
  bottomMax: number;
  bottomDefault: number;
  baseClipBounds: BlueprintBounds;
};
