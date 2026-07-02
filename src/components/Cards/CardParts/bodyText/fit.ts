import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";

import type { TextAlignment } from "./types";
import type { CardTextLayout } from "../CardTextBlock";

type LayoutFn = (input: {
  text?: string | null;
  width: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacingEm?: number;
  defaultAlign?: TextAlignment;
}) => CardTextLayout;

export type FittedCardTextLayout = CardTextLayout & {
  fittedFontSize: number;
  fitApplied: boolean;
  overflowed: boolean;
};

export function layoutCardTextToBounds({
  layout,
  text,
  width,
  height,
  fontSize = 22,
  lineHeight,
  fontFamily = CARD_TEXT_FONT_FAMILY,
  fontWeight,
  letterSpacingEm,
  defaultAlign = "left",
  fitToBounds = false,
  minFontSize = 12,
}: {
  layout: LayoutFn;
  text?: string | null;
  width: number;
  height: number;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacingEm?: number;
  defaultAlign?: TextAlignment;
  fitToBounds?: boolean;
  minFontSize?: number;
}): FittedCardTextLayout {
  const resolveLayout = (size: number): CardTextLayout => {
    const lineHeightAtSize =
      typeof lineHeight === "number" && fontSize > 0 ? (lineHeight * size) / fontSize : undefined;

    return layout({
      text,
      width,
      fontSize: size,
      lineHeight: lineHeightAtSize,
      fontFamily,
      fontWeight,
      letterSpacingEm,
      defaultAlign,
    });
  };

  const overflowsHeight = (candidate: CardTextLayout) => candidate.totalHeight > height;

  const initial = resolveLayout(fontSize);
  if (!fitToBounds || !text?.trim() || !Number.isFinite(height) || height <= 0) {
    return {
      ...initial,
      fittedFontSize: fontSize,
      fitApplied: false,
      overflowed: overflowsHeight(initial),
    };
  }

  if (!overflowsHeight(initial)) {
    return {
      ...initial,
      fittedFontSize: fontSize,
      fitApplied: false,
      overflowed: false,
    };
  }

  const clampedMin = Math.max(1, Math.min(minFontSize, fontSize));
  const minLayout = resolveLayout(clampedMin);
  if (overflowsHeight(minLayout)) {
    return {
      ...minLayout,
      fittedFontSize: clampedMin,
      fitApplied: true,
      overflowed: true,
    };
  }

  const initialScaleGuess = Math.max(clampedMin, (fontSize * height) / initial.totalHeight);
  let low = clampedMin;
  let high = fontSize;
  let bestFontSize = Math.max(clampedMin, Math.min(fontSize, initialScaleGuess));
  let bestLayout = resolveLayout(bestFontSize);

  if (overflowsHeight(bestLayout)) {
    high = bestFontSize;
    bestFontSize = clampedMin;
    bestLayout = minLayout;
  } else {
    low = bestFontSize;
  }

  for (let i = 0; i < 8; i += 1) {
    if (high - low <= 0.25) break;
    const candidateSize = (low + high) / 2;
    const candidateLayout = resolveLayout(candidateSize);
    if (overflowsHeight(candidateLayout)) {
      high = candidateSize;
    } else {
      low = candidateSize;
      bestFontSize = candidateSize;
      bestLayout = candidateLayout;
    }
  }

  return {
    ...bestLayout,
    fittedFontSize: bestFontSize,
    fitApplied: bestFontSize < fontSize,
    overflowed: false,
  };
}
