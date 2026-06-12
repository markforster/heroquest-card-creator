"use client";

import { DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import { blueprintsByTemplateId } from "@/data/blueprints";

import type { CardPreviewProps } from "./types";

export function resolveCopyrightTextStyle(templateId?: CardPreviewProps["templateId"]) {
  if (!templateId) {
    return {
      fontSize: 16,
      fontWeight: undefined as number | string | undefined,
      fontFamily: "Helvetica, Arial, sans-serif",
      letterSpacingEm: undefined as number | undefined,
      fill: DEFAULT_COPYRIGHT_COLOR,
    };
  }
  const blueprint = blueprintsByTemplateId[templateId];
  const layer = blueprint?.layers.find((entry) => entry.type === "copyright");
  const layerProps = layer?.props ?? {};
  const fontSize = typeof layerProps.fontSize === "number" ? layerProps.fontSize : 16;
  const fontWeight =
    typeof layerProps.fontWeight === "number" || typeof layerProps.fontWeight === "string"
      ? layerProps.fontWeight
      : undefined;
  const fontFamily =
    typeof layerProps.fontFamily === "string"
      ? layerProps.fontFamily
      : "Helvetica, Arial, sans-serif";
  const letterSpacingEm =
    typeof layerProps.letterSpacingEm === "number" ? layerProps.letterSpacingEm : undefined;
  const fill = typeof layerProps.fill === "string" ? layerProps.fill : DEFAULT_COPYRIGHT_COLOR;
  return { fontSize, fontWeight, fontFamily, letterSpacingEm, fill };
}
