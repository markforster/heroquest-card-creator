"use client";

import { useId } from "react";

import Layer from "@/components/Cards/CardPreview/Layer";
import { DEFAULT_BORDER_COLOR, splitHexAlpha } from "@/components/Cards/CardParts/CardBorder";

import type { StaticImageData } from "next/image";

type CardTexturedBorderProps = {
  alphaMask: StaticImageData;
  textureMask: StaticImageData;
  backgroundLoaded?: boolean;
  color?: string;
  width?: number;
  height?: number;
  blendMode?: "multiply" | "overlay" | "screen";
};

function normalizeId(rawId: string) {
  return rawId.replace(/:/g, "");
}

export default function CardTexturedBorder({
  alphaMask,
  textureMask,
  backgroundLoaded,
  color,
  width = 750,
  height = 1050,
  blendMode = "multiply",
}: CardTexturedBorderProps) {
  const maskId = normalizeId(useId());
  const filterId = normalizeId(useId());
  const { color: resolvedColor, alpha: resolvedAlpha } = splitHexAlpha(
    color?.trim() ? color : DEFAULT_BORDER_COLOR,
  );
  const resolvedOpacity = resolvedAlpha ?? 1;

  return (
    <Layer>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
          <image
            href={alphaMask.src}
            data-template-asset="border-mask"
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
        <filter
          id={filterId}
          x={0}
          y={0}
          width={width}
          height={height}
          filterUnits="userSpaceOnUse"
        >
          <feImage
            href={textureMask.src}
            data-template-asset="border-texture"
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
            result="texture"
          />
          <feBlend in="SourceGraphic" in2="texture" mode={blendMode} />
        </filter>
      </defs>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={resolvedColor}
        mask={`url(#${maskId})`}
        filter={`url(#${filterId})`}
        style={{ opacity: resolvedOpacity }}
      />
    </Layer>
  );
}
