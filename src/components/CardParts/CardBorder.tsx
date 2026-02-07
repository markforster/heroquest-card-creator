"use client";

import { useId } from "react";

import Layer from "@/components/CardPreview/Layer";

import type { StaticImageData } from "next/image";

type CardBorderProps = {
  mask?: StaticImageData;
  backgroundLoaded?: boolean;
  color?: string;
  width?: number;
  height?: number;
};

export const DEFAULT_BORDER_COLOR = "#310101";

function normalizeMaskId(rawId: string) {
  return rawId.replace(/:/g, "");
}

export default function CardBorder({
  mask,
  backgroundLoaded,
  color,
  width = 750,
  height = 1050,
}: CardBorderProps) {
  const maskId = normalizeMaskId(useId());
  const resolvedColor = color?.trim() ? color : DEFAULT_BORDER_COLOR;

  if (!mask) {
    return null;
  }

  return (
    <Layer>
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          <image
            href={mask.src}
            x={0}
            y={0}
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
        style={{ opacity: backgroundLoaded === false ? 0 : 1 }}
      />
    </Layer>
  );
}
