"use client";

import { useId } from "react";

import { DEFAULT_BORDER_COLOR, splitHexAlpha } from "@/components/Cards/CardParts/CardBorder";
import Layer from "@/components/Cards/CardPreview/Layer";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";

import type { StaticImageData } from "next/image";

type CardTexturedBorderProps = {
  alphaMask: StaticImageData;
  textureMask: StaticImageData;
  backgroundLoaded?: boolean;
  color?: string;
  width?: number;
  height?: number;
  blendMode?: "multiply" | "overlay" | "screen";
  offsetX?: number;
  offsetY?: number;
};

function normalizeId(rawId: string) {
  return rawId.replace(/:/g, "");
}

export default function CardTexturedBorder({
  alphaMask,
  textureMask,
  color,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  blendMode = "multiply",
  offsetX = 0,
  offsetY = 0,
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
            x={offsetX}
            y={offsetY}
            width={width}
            height={height}
            preserveAspectRatio="none"
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
            x={offsetX}
            y={offsetY}
            width={width}
            height={height}
            preserveAspectRatio="none"
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
