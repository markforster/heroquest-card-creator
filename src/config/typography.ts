import type { CSSProperties } from "react";

export const EMPHASIZED_LABEL_WEIGHT = 700;

export const CARD_NUMERIC_FONT_VARIANT_LINING = "lining-nums";
export const CARD_NUMERIC_FONT_VARIANT_TABULAR = "tabular-nums";
export const CARD_NUMERIC_FONT_FEATURE_LINING = '"lnum" 1';
export const CARD_NUMERIC_FONT_FEATURE_TABULAR = '"tnum" 1';

export function buildNumericFontStyle({
  lining = false,
  tabular = false,
}: {
  lining?: boolean;
  tabular?: boolean;
}): CSSProperties | undefined {
  const variantParts = [
    lining ? CARD_NUMERIC_FONT_VARIANT_LINING : null,
    tabular ? CARD_NUMERIC_FONT_VARIANT_TABULAR : null,
  ].filter((value): value is string => Boolean(value));
  const featureParts = [
    lining ? CARD_NUMERIC_FONT_FEATURE_LINING : null,
    tabular ? CARD_NUMERIC_FONT_FEATURE_TABULAR : null,
  ].filter((value): value is string => Boolean(value));

  if (variantParts.length === 0 && featureParts.length === 0) {
    return undefined;
  }

  return {
    fontVariantNumeric: variantParts.join(" "),
    fontFeatureSettings: featureParts.join(", "),
  };
}
