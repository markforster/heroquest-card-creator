"use client";

import { AlertTriangle } from "lucide-react";

import Layer from "@/components/Cards/CardPreview/Layer";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { layerTypes } from "@/data/card-systems/types";
import { useI18n } from "@/i18n/I18nProvider";
import { clamp } from "@/lib/math";
import type { Blueprint, BlueprintBounds, BlueprintLayer } from "@/types/blueprints";

export const DEFAULT_CANVAS = { width: CARD_WIDTH, height: CARD_HEIGHT };
export const MISSING_ARTWORK_COLOR = "#e0b15b";

export function normalizeClipId(rawId: string) {
  return rawId.replace(/:/g, "");
}

export function getLayerBounds(blueprint: Blueprint, layer: BlueprintLayer) {
  return (
    layer.bounds ?? {
      x: 0,
      y: 0,
      width: blueprint.canvas?.width ?? DEFAULT_CANVAS.width,
      height: blueprint.canvas?.height ?? DEFAULT_CANVAS.height,
    }
  );
}

export function findPrimaryTitleLayer(blueprint: Blueprint): BlueprintLayer | undefined {
  return blueprint.layers.find((layer) => layer.type === layerTypes.title);
}

export function isPrimaryBodyTextLayer(blueprint: Blueprint, layer: BlueprintLayer): boolean {
  return (
    layer.type === layerTypes.text &&
    layer.bind?.textKey === "description" &&
    blueprint.layers.includes(layer)
  );
}

export function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  if (maxChars <= 3) return value.slice(0, maxChars);
  return `${value.slice(0, maxChars - 3)}...`;
}

export function MissingArtworkPlaceholder({
  bounds,
  assetName,
  scale = 1,
}: {
  bounds: BlueprintBounds;
  assetName?: string;
  scale?: number;
}) {
  const { t } = useI18n();
  const { width, height, x, y } = bounds;
  const minSize = Math.min(width, height);
  const iconSize = clamp(minSize * 0.18 * scale, 16, 80);
  const fontSize = clamp(minSize * 0.08 * scale, 10, 36);
  const lineHeight = fontSize * 1.2;
  const label = t("label.artworkMissing");
  const detail = assetName || t("label.unknownAsset");
  const maxChars = Math.max(8, Math.floor(width / (fontSize * 0.6)));
  const truncatedDetail = truncateText(detail, maxChars);

  const contentHeight = iconSize + lineHeight * 2;
  const contentTop = y + (height - contentHeight) / 2;
  const iconX = x + (width - iconSize) / 2;
  const iconY = contentTop;
  const line1Y = iconY + iconSize + lineHeight * 0.9;
  const line2Y = line1Y + lineHeight;

  return (
    <Layer>
      <AlertTriangle
        width={iconSize}
        height={iconSize}
        x={iconX}
        y={iconY}
        color={MISSING_ARTWORK_COLOR}
      />
      <text
        x={x + width / 2}
        y={line1Y}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="Carter Sans W04, serif"
        fill={MISSING_ARTWORK_COLOR}
      >
        {label}
      </text>
      <text
        x={x + width / 2}
        y={line2Y}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="Carter Sans W04, serif"
        fill={MISSING_ARTWORK_COLOR}
      >
        {truncatedDetail}
      </text>
    </Layer>
  );
}
