"use client";

import { useId } from "react";

import Layer from "@/components/Cards/CardPreview/Layer";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";

import type { StaticImageData } from "next/image";

type CardBorderProps = {
  mask?: StaticImageData;
  backgroundLoaded?: boolean;
  color?: string;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
};

export const DEFAULT_BORDER_COLOR = "#310101";

function normalizeMaskId(rawId: string) {
  return rawId.replace(/:/g, "");
}

export default function CardBorder({
  mask,
  color,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  offsetX = 0,
  offsetY = 0,
}: CardBorderProps) {
  const maskId = normalizeMaskId(useId());
  const { color: resolvedColor, alpha: resolvedAlpha } = splitHexAlpha(
    color?.trim() ? color : DEFAULT_BORDER_COLOR,
  );
  const resolvedOpacity = resolvedAlpha ?? 1;

  if (!mask) {
    return null;
  }

  return (
    <Layer>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <image
            href={mask.src}
            data-template-asset="border-mask"
            x={offsetX}
            y={offsetY}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={resolvedColor}
        mask={`url(#${maskId})`}
        style={{ opacity: resolvedOpacity }}
      />
    </Layer>
  );
}

export function splitHexAlpha(value: string): { color: string; alpha?: number } {
  const trimmed = value.trim();
  if (!trimmed) return { color: DEFAULT_BORDER_COLOR };
  if (trimmed.toLowerCase() === "transparent") {
    return { color: DEFAULT_BORDER_COLOR, alpha: 0 };
  }
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(raw)) return { color: trimmed };
  if (raw.length === 3) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    return { color: `#${r}${r}${g}${g}${b}${b}` };
  }
  if (raw.length === 8) {
    return {
      color: `#${raw.slice(0, 6)}`,
      alpha: parseInt(raw.slice(6, 8), 16) / 255,
    };
  }
  if (raw.length === 4) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    const a = raw[3];
    return {
      color: `#${r}${r}${g}${g}${b}${b}`,
      alpha: parseInt(`${a}${a}`, 16) / 255,
    };
  }
  return { color: trimmed };
}
