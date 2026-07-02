"use client";

import CardTextBlock, {
  clipRowsToHeight,
  layoutCardText,
  measureCardTextMaxLineWidth,
} from "@/components/Cards/CardParts/CardTextBlock";
import {
  EDITOR_TARGET_IDS,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { CARD_CORNER_RADIUS } from "@/components/Cards/CardPreview/consts";
import Layer from "@/components/Cards/CardPreview/Layer";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { DEFAULT_BODY_TEXT_COLOR, DEFAULT_COPYRIGHT_COLOR } from "@/config/colors";
import {
  DEVELOPER_CREDIT_BLEND_COLOR,
  DEVELOPER_CREDIT_BLEND_MODE,
  DEVELOPER_CREDIT_FONT_SCALE,
  DEVELOPER_CREDIT_OPACITY,
  DEVELOPER_CREDIT_RIGHT_INSET,
  DEVELOPER_CREDIT_TEXT,
  DEVELOPER_CREDIT_TOP_INSET,
} from "@/config/developer-credit";
import { layerTypes } from "@/data/card-systems/types";
import { cardTemplatesById } from "@/data/card-templates";
import { supportsBlueprintTextFitToBounds } from "@/lib/blueprint-text";
import { resolveEffectiveFace } from "@/lib/card-face";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import type { Blueprint, BlueprintBounds, BlueprintLayer } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { TemplateId } from "@/types/templates";

import { getLayerBounds, isPrimaryBodyTextLayer } from "./blueprintRendererShared";

function resolveVisibleCopyrightBounds({
  blueprint,
  cardData,
  defaultCopyright,
}: {
  blueprint: Blueprint;
  cardData?: CardDataByTemplate[TemplateId];
  defaultCopyright: string;
}) {
  if (!cardData) return null;
  const template = cardTemplatesById[blueprint.templateId];
  const effectiveFace = template
    ? resolveEffectiveFace((cardData as { face?: CardFace }).face, template.defaultFace)
    : (cardData as { face?: CardFace }).face;
  if (effectiveFace !== "front") return null;
  const showCopyright =
    typeof (cardData as { showCopyright?: boolean }).showCopyright === "boolean"
      ? (cardData as { showCopyright?: boolean }).showCopyright
      : undefined;
  if (showCopyright === false) return null;

  const copyrightLayer = blueprint.layers.find((entry) => entry.type === layerTypes.copyright);
  if (!copyrightLayer) return null;

  const textKey = copyrightLayer.bind?.textKey;
  const overrideValue =
    textKey && cardData
      ? ((cardData as Record<string, unknown>)[textKey] as string | null | undefined)
      : undefined;
  const normalizedOverride = typeof overrideValue === "string" ? overrideValue.trim() : "";
  const normalizedDefault = defaultCopyright.trim();
  const resolvedText =
    normalizedOverride.length > 0
      ? normalizedOverride
      : normalizedDefault.length > 0
        ? normalizedDefault
        : "";
  if (!resolvedText) return null;

  return getLayerBounds(blueprint, copyrightLayer);
}

function resolveCopyrightTextStyle(blueprint: Blueprint) {
  const copyrightLayer = blueprint.layers.find((entry) => entry.type === layerTypes.copyright);
  const layerProps = copyrightLayer?.props ?? {};
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

  return {
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacingEm,
    fill,
  };
}

function splitHexAlpha(value: string | undefined): { color: string; alpha?: number } {
  if (!value) return { color: "#000000" };
  const trimmed = value.trim();
  if (!trimmed) return { color: "#000000" };
  if (trimmed.toLowerCase() === "transparent") {
    return { color: "#000000", alpha: 0 };
  }
  const raw = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    return { color: trimmed };
  }
  if (raw.length === 3 || raw.length === 4) {
    const r = raw[0];
    const g = raw[1];
    const b = raw[2];
    const a = raw.length === 4 ? raw[3] : "f";
    return {
      color: `#${r}${r}${g}${g}${b}${b}`,
      alpha: parseInt(`${a}${a}`, 16) / 255,
    };
  }
  if (raw.length === 8) {
    return {
      color: `#${raw.slice(0, 6)}`,
      alpha: parseInt(raw.slice(6, 8), 16) / 255,
    };
  }
  if (raw.length === 6) {
    return { color: `#${raw}` };
  }
  return { color: trimmed };
}

function splitTextOnHr(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const segments: string[] = [];
  let current: string[] = [];

  lines.forEach((line) => {
    if (line.trim() === "---") {
      segments.push(current.join("\n"));
      current = [];
      return;
    }
    current.push(line);
  });

  segments.push(current.join("\n"));
  return segments;
}

function buildBackdropPath(
  bounds: BlueprintBounds,
  cornerRadius: { top: number; bottom: number },
): string {
  const rTop = Math.max(0, Math.min(cornerRadius.top, bounds.width / 2, bounds.height / 2));
  const rBottom = Math.max(0, Math.min(cornerRadius.bottom, bounds.width / 2, bounds.height / 2));
  const x = bounds.x;
  const y = bounds.y;
  const w = bounds.width;
  const h = bounds.height;
  const right = x + w;
  const bottom = y + h;
  return [
    `M ${x + rTop} ${y}`,
    `H ${right - rTop}`,
    `Q ${right} ${y} ${right} ${y + rTop}`,
    `V ${bottom - rBottom}`,
    `Q ${right} ${bottom} ${right - rBottom} ${bottom}`,
    `H ${x + rBottom}`,
    `Q ${x} ${bottom} ${x} ${bottom - rBottom}`,
    `V ${y + rTop}`,
    `Q ${x} ${y} ${x + rTop} ${y}`,
    "Z",
  ].join(" ");
}

export function TextLayer({
  blueprint,
  layer,
  cardData,
  showTextBounds = false,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
  showTextBounds?: boolean;
}) {
  const { defaultCopyright } = useCopyrightSettings();
  const bodyTextFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.textMain);

  if (layer.type !== layerTypes.text) return null;
  if (!layer.bind?.textKey) return null;
  if (!cardData) return null;

  const textKey = layer.bind.textKey;
  const text = (cardData as Record<string, unknown>)[textKey];
  if (typeof text !== "string" && text != null) return null;

  if (layer.when?.hasText) {
    const testValue = (cardData as Record<string, unknown>)[layer.when.hasText];
    if (!testValue) return null;
  }

  const getPlacementBounds = (prefix: string) => {
    const x = layer.props?.[`${prefix}X`];
    const y = layer.props?.[`${prefix}Y`];
    const width = layer.props?.[`${prefix}Width`];
    const height = layer.props?.[`${prefix}Height`];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof width === "number" &&
      typeof height === "number"
    ) {
      return { x, y, width, height };
    }
    return undefined;
  };

  const labelledBackData = cardData as {
    titlePlacement?: "top" | "bottom";
    showTitle?: boolean;
    bodyTextStyle?: {
      enabled?: boolean;
      backdrop?: {
        enabled?: boolean;
        color?: string;
        opacity?: number;
        insetMode?: "matchBorder" | "flush";
        cornerMode?: "all" | "opposite-title";
        fitMode?: "full" | "fit-to-text";
      };
    };
  };
  const placement =
    blueprint.templateId === "labelled-back" ? labelledBackData.titlePlacement : undefined;
  const hideTitle =
    blueprint.templateId === "labelled-back" ? labelledBackData.showTitle === false : false;
  const bodyTextEnabled =
    blueprint.templateId === "labelled-back"
      ? (labelledBackData.bodyTextStyle?.enabled ?? false)
      : true;
  if (blueprint.templateId === "labelled-back" && !bodyTextEnabled) {
    return null;
  }
  let baseBounds = hideTitle
    ? (getPlacementBounds("hidden") ?? getLayerBounds(blueprint, layer))
    : placement === "top"
      ? (getPlacementBounds("top") ?? getLayerBounds(blueprint, layer))
      : getLayerBounds(blueprint, layer);
  let flushBounds = hideTitle
    ? (getPlacementBounds("flushHidden") ?? baseBounds)
    : placement === "top"
      ? (getPlacementBounds("flushTop") ?? baseBounds)
      : (getPlacementBounds("flush") ?? baseBounds);
  const fontSize = typeof layer.props?.fontSize === "number" ? layer.props.fontSize : undefined;
  const lineHeight =
    typeof layer.props?.lineHeight === "number" ? layer.props.lineHeight : undefined;
  const fontWeight =
    typeof layer.props?.fontWeight === "number" || typeof layer.props?.fontWeight === "string"
      ? layer.props.fontWeight
      : undefined;
  const fontFamily =
    typeof layer.props?.fontFamily === "string" ? layer.props.fontFamily : undefined;
  const layerFill = typeof layer.props?.fill === "string" ? layer.props.fill : undefined;
  const bodyTextColor =
    textKey === "description"
      ? ((cardData as { bodyTextColor?: string }).bodyTextColor ?? DEFAULT_BODY_TEXT_COLOR)
      : undefined;
  const bodyTextFitToBounds =
    textKey === "description"
      ? ((cardData as { bodyTextFitToBounds?: boolean }).bodyTextFitToBounds ?? false)
      : false;
  const allowBodyTextFitToBounds =
    textKey === "description" ? supportsBlueprintTextFitToBounds(layer) : false;
  const showOverflowWarning = layer.props?.textLayoutMode === "fixed-bounds";
  const fill = bodyTextColor ?? layerFill;
  const letterSpacingEm =
    typeof layer.props?.letterSpacingEm === "number" ? layer.props.letterSpacingEm : undefined;
  const align =
    layer.props?.align === "left" ||
    layer.props?.align === "center" ||
    layer.props?.align === "right"
      ? layer.props.align
      : undefined;

  const defaultBackdropEnabled =
    layer.props && typeof layer.props.backdrop === "boolean" ? layer.props.backdrop : false;
  const defaultBackdropFill =
    layer.props && typeof layer.props.backdropFill === "string"
      ? layer.props.backdropFill
      : "#ffffff";
  const defaultBackdropOpacity =
    layer.props && typeof layer.props.backdropOpacity === "number"
      ? layer.props.backdropOpacity
      : 0.2;
  const defaultBackdropRadius =
    layer.props && typeof layer.props.backdropRadius === "number" ? layer.props.backdropRadius : 0;
  const defaultBackdropInsetMode =
    layer.props && typeof layer.props.backdropInsetMode === "string"
      ? layer.props.backdropInsetMode
      : "matchBorder";
  const defaultBackdropCornerMode =
    layer.props && typeof layer.props.backdropCornerMode === "string"
      ? layer.props.backdropCornerMode
      : "all";
  const defaultBackdropFitMode =
    layer.props && typeof layer.props.backdropFitMode === "string"
      ? layer.props.backdropFitMode
      : "full";
  const textPadding =
    layer.props && typeof layer.props.textPadding === "number" ? layer.props.textPadding : 0;

  const getTitleBounds = (titleProps: Record<string, unknown>, prefix: string) => {
    const x = titleProps[`${prefix}X`];
    const y = titleProps[`${prefix}Y`];
    const width = titleProps[`${prefix}Width`];
    const height = titleProps[`${prefix}Height`];
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      typeof width === "number" &&
      typeof height === "number"
    ) {
      return { x, y, width, height };
    }
    return undefined;
  };

  if (blueprint.templateId === "labelled-back" && placement === "bottom" && !hideTitle) {
    const titleLayer = blueprint.layers.find((entry) => entry.type === layerTypes.title);
    const titleProps = titleLayer?.props ?? {};

    const ribbonBottomBounds = getTitleBounds(titleProps, "ribbon");
    const ribbonTopBounds = getTitleBounds(titleProps, "ribbonTop");
    const textTopBounds = getPlacementBounds("top");

    if (ribbonBottomBounds && ribbonTopBounds && textTopBounds) {
      const desiredGap =
        textTopBounds.y - (ribbonTopBounds.y + ribbonTopBounds.height) + textPadding;
      if (desiredGap >= 0) {
        const desiredBottom = ribbonBottomBounds.y - desiredGap;
        if (desiredBottom > baseBounds.y) {
          const nextHeight = desiredBottom - baseBounds.y;
          if (nextHeight > 0) {
            baseBounds = { ...baseBounds, height: nextHeight };
            if (desiredBottom > flushBounds.y) {
              flushBounds = { ...flushBounds, height: desiredBottom - flushBounds.y };
            }
          }
        }
      }
    }
  }

  const clampHeightToBottomLimit = (bounds: { y: number; height: number }, bottomLimitY: number) =>
    Math.max(0, Math.min(bounds.height, bottomLimitY - bounds.y));

  if (blueprint.templateId === "labelled-back" && placement === "bottom" && !hideTitle) {
    const titleLayer = blueprint.layers.find((entry) => entry.type === layerTypes.title);
    const titleProps = titleLayer?.props ?? {};
    const ribbonBottomBounds = getTitleBounds(titleProps, "ribbon");
    if (ribbonBottomBounds) {
      const fontSizeResolved = fontSize ?? 22;
      const minBottomGap = fontSizeResolved;
      const bottomLimitY = ribbonBottomBounds.y - minBottomGap;
      baseBounds = {
        ...baseBounds,
        height: clampHeightToBottomLimit(baseBounds, bottomLimitY),
      };
      flushBounds = {
        ...flushBounds,
        height: clampHeightToBottomLimit(flushBounds, bottomLimitY),
      };
    }
  }

  if (
    (blueprint.templateId === "small-treasure" || blueprint.templateId === "large-treasure") &&
    isPrimaryBodyTextLayer(blueprint, layer)
  ) {
    const copyrightBounds = resolveVisibleCopyrightBounds({
      blueprint,
      cardData,
      defaultCopyright,
    });
    if (copyrightBounds) {
      const bottomLimitY = copyrightBounds.y - 2;
      baseBounds = {
        ...baseBounds,
        height: clampHeightToBottomLimit(baseBounds, bottomLimitY),
      };
      flushBounds = {
        ...flushBounds,
        height: clampHeightToBottomLimit(flushBounds, bottomLimitY),
      };
    }
  }
  const overrides = labelledBackData.bodyTextStyle?.backdrop ?? {};
  const resolvedBackdropColor = overrides.color ?? defaultBackdropFill;
  const { color: backdropFill, alpha: backdropAlpha } = splitHexAlpha(resolvedBackdropColor);
  const resolvedBackdropOpacity =
    typeof overrides.opacity === "number"
      ? overrides.opacity
      : typeof backdropAlpha === "number"
        ? backdropAlpha
        : defaultBackdropOpacity;
  const effectiveBackdrop = {
    enabled: overrides.enabled ?? defaultBackdropEnabled,
    color: backdropFill,
    opacity: resolvedBackdropOpacity,
    insetMode: overrides.insetMode ?? defaultBackdropInsetMode,
    cornerMode: overrides.cornerMode ?? defaultBackdropCornerMode,
    fitMode: overrides.fitMode ?? defaultBackdropFitMode,
    radius: defaultBackdropRadius,
  };
  let backdropBounds = effectiveBackdrop.insetMode === "flush" ? flushBounds : baseBounds;
  const textBoundsBase = baseBounds;
  const backdropWhenImageKey =
    layer.props && typeof layer.props.backdropWhenImageKey === "string"
      ? layer.props.backdropWhenImageKey
      : undefined;
  const hasBodyText = typeof text === "string" && text.trim().length > 0;
  const shouldShowBackdrop =
    effectiveBackdrop.enabled &&
    hasBodyText &&
    (!backdropWhenImageKey || Boolean((cardData as Record<string, unknown>)[backdropWhenImageKey]));

  const paddedTextBounds =
    textPadding > 0
      ? {
          x: textBoundsBase.x + textPadding,
          y: textBoundsBase.y + textPadding,
          width: Math.max(0, textBoundsBase.width - textPadding * 2),
          height: Math.max(0, textBoundsBase.height - textPadding * 2),
        }
      : textBoundsBase;

  const splitSegments =
    typeof text === "string" ? splitTextOnHr(text).filter((segment) => segment.trim() !== "") : [];
  const useSegmentedBackdrop = shouldShowBackdrop && splitSegments.length > 1;

  if (effectiveBackdrop.fitMode === "fit-to-text" && shouldShowBackdrop) {
    const fontSizeResolved = fontSize ?? 22;
    const safeWidth = Math.max(0, textBoundsBase.width - textPadding * 2);
    const { totalHeight } = layoutCardText({
      text: text as string,
      width: safeWidth,
      fontSize: fontSizeResolved,
      lineHeight,
      fontFamily,
      defaultAlign: align ?? "left",
    });
    const minBottomPadding =
      placement === "bottom" && !hideTitle && effectiveBackdrop.insetMode === "flush"
        ? fontSizeResolved
        : 0;
    const maxTextHeight = Math.max(0, backdropBounds.height - textPadding * 2 - minBottomPadding);
    const textHeight = Math.min(totalHeight, maxTextHeight);
    const desiredHeight = Math.min(
      backdropBounds.height,
      textHeight + textPadding * 2 + minBottomPadding,
    );
    backdropBounds = {
      ...backdropBounds,
      height: desiredHeight,
    };
  }

  const clampRadius = (radius: number) =>
    Math.max(0, Math.min(radius, backdropBounds.width / 2, backdropBounds.height / 2));
  const resolvedRadius =
    effectiveBackdrop.fitMode === "fit-to-text" && effectiveBackdrop.insetMode === "flush"
      ? 0
      : clampRadius(effectiveBackdrop.radius);
  const cornerRadius =
    effectiveBackdrop.cornerMode === "all"
      ? {
          top: resolvedRadius,
          bottom: resolvedRadius,
        }
      : hideTitle
        ? {
            top: resolvedRadius,
            bottom: resolvedRadius,
          }
        : placement === "top"
          ? {
              top: 0,
              bottom: resolvedRadius,
            }
          : {
              top: resolvedRadius,
              bottom: 0,
            };

  const flushBackdrop = effectiveBackdrop.insetMode === "flush";
  const effectiveCornerRadius = flushBackdrop ? { top: 0, bottom: 0 } : cornerRadius;

  if (useSegmentedBackdrop) {
    const fontSizeResolved = fontSize ?? 22;
    const lineHeightDefault = lineHeight ?? fontSizeResolved * 1.05;
    const gap = Math.max(lineHeightDefault, fontSizeResolved + textPadding * 2) * 0.5;
    const textAreaWidth = Math.max(0, paddedTextBounds.width);
    const textAreaX = paddedTextBounds.x;
    let cursorBubbleY = backdropBounds.y;

    const segmentItems: Array<{
      text: string;
      textBounds: BlueprintBounds;
      backdropBounds: BlueprintBounds;
      lineHeight: number;
    }> = [];

    splitSegments.forEach((segment, index) => {
      const remainingBubbleHeight = backdropBounds.y + backdropBounds.height - cursorBubbleY;
      if (remainingBubbleHeight <= 0) return;

      const { rows, lines, lineHeight: resolvedLineHeight } = layoutCardText({
        text: segment,
        width: textAreaWidth,
        fontSize: fontSizeResolved,
        lineHeight,
        fontFamily,
        defaultAlign: align ?? "left",
      });
      if (lines.length === 0) return;

      const isLastSegment = index === splitSegments.length - 1;
      const minBottomPadding =
        isLastSegment &&
        placement === "bottom" &&
        !hideTitle &&
        effectiveBackdrop.insetMode === "flush"
          ? fontSizeResolved
          : 0;
      const isFullHeight = effectiveBackdrop.fitMode === "full";
      const availableForThisSegment = Math.max(
        0,
        remainingBubbleHeight - (isLastSegment ? 0 : gap),
      );
      const textBoundsY = Math.max(cursorBubbleY + textPadding, paddedTextBounds.y);
      const bubbleTopPadding = textBoundsY - cursorBubbleY;
      const maxTextHeight = Math.max(
        0,
        availableForThisSegment - bubbleTopPadding - textPadding - minBottomPadding,
      );
      const visibleRows = clipRowsToHeight(rows, maxTextHeight);
      const visibleTextRows = visibleRows.filter((row) => row.kind !== "paragraph-gap");
      if (visibleTextRows.length === 0) return;

      const textHeight = visibleRows.reduce((sum, row) => sum + row.height, 0);
      const bubbleHeight =
        isLastSegment && isFullHeight
          ? availableForThisSegment
          : bubbleTopPadding + textHeight + textPadding + minBottomPadding;

      const textBounds = {
        x: textAreaX,
        y: textBoundsY,
        width: textAreaWidth,
        height: textHeight,
      };

      segmentItems.push({
        text: segment,
        textBounds,
        backdropBounds: {
          x: backdropBounds.x,
          y: cursorBubbleY,
          width: backdropBounds.width,
          height: bubbleHeight,
        },
        lineHeight: resolvedLineHeight,
      });

      cursorBubbleY += bubbleHeight;
      if (!isLastSegment && cursorBubbleY + gap <= backdropBounds.y + backdropBounds.height) {
        cursorBubbleY += gap;
      }
    });

    const segmentCount = segmentItems.length;

    return (
      <Layer key={layer.id} {...(isPrimaryBodyTextLayer(blueprint, layer) ? bodyTextFocusProps : {})}>
        {segmentItems.map((segment, index) => {
          const segmentCornerRadius = flushBackdrop
            ? { top: 0, bottom: 0 }
            : segmentCount <= 1
              ? effectiveCornerRadius
              : {
                  top: index === 0 ? effectiveCornerRadius.top : resolvedRadius,
                  bottom:
                    index === segmentCount - 1 ? effectiveCornerRadius.bottom : resolvedRadius,
                };

          return (
            <g key={`${layer.id}-segment-${index}`}>
              <path
                d={buildBackdropPath(segment.backdropBounds, segmentCornerRadius)}
                fill={effectiveBackdrop.color}
                opacity={effectiveBackdrop.opacity}
              />
              <CardTextBlock
                text={segment.text}
                bounds={segment.textBounds}
                fontSize={fontSize}
                lineHeight={segment.lineHeight}
                fontWeight={fontWeight}
                fontFamily={fontFamily}
                fill={fill}
                letterSpacingEm={letterSpacingEm}
                align={align}
                debug={showTextBounds}
                fitToBounds={allowBodyTextFitToBounds && bodyTextFitToBounds}
                showOverflowWarning={showOverflowWarning}
              />
            </g>
          );
        })}
      </Layer>
    );
  }

  const backdropPath = buildBackdropPath(backdropBounds, effectiveCornerRadius);

  return (
    <Layer key={layer.id} {...(isPrimaryBodyTextLayer(blueprint, layer) ? bodyTextFocusProps : {})}>
      {shouldShowBackdrop ? (
        <path d={backdropPath} fill={effectiveBackdrop.color} opacity={effectiveBackdrop.opacity} />
      ) : null}
      <CardTextBlock
        text={text as string | null | undefined}
        bounds={paddedTextBounds}
        fontSize={fontSize}
        lineHeight={lineHeight}
        fontWeight={fontWeight}
        fontFamily={fontFamily}
        fill={fill}
        letterSpacingEm={letterSpacingEm}
        align={align}
        debug={showTextBounds}
        fitToBounds={allowBodyTextFitToBounds && bodyTextFitToBounds}
        showOverflowWarning={showOverflowWarning}
      />
    </Layer>
  );
}

export function CopyrightLayer({
  blueprint,
  layer,
  cardData,
  copyrightTextColor,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
  copyrightTextColor?: string;
}) {
  const { defaultCopyright } = useCopyrightSettings();
  const { showTextBounds } = useDebugVisuals();
  const svgFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.copyright);

  if (layer.type !== "copyright") return null;
  if (!cardData) return null;

  const template = cardTemplatesById[blueprint.templateId];
  const effectiveFace = template
    ? resolveEffectiveFace((cardData as { face?: CardFace }).face, template.defaultFace)
    : (cardData as { face?: CardFace }).face;
  if (effectiveFace !== "front") return null;
  const showCopyright =
    typeof (cardData as { showCopyright?: boolean }).showCopyright === "boolean"
      ? (cardData as { showCopyright?: boolean }).showCopyright
      : undefined;
  if (showCopyright === false) return null;

  const textKey = layer.bind?.textKey;
  const overrideValue =
    textKey && cardData
      ? ((cardData as Record<string, unknown>)[textKey] as string | null | undefined)
      : undefined;
  const normalizedOverride = typeof overrideValue === "string" ? overrideValue.trim() : "";
  const normalizedDefault = defaultCopyright.trim();
  const resolvedText =
    normalizedOverride.length > 0
      ? normalizedOverride
      : normalizedDefault.length > 0
        ? normalizedDefault
        : "";
  if (!resolvedText) return null;

  const bounds = getLayerBounds(blueprint, layer);
  const fontSize = typeof layer.props?.fontSize === "number" ? layer.props.fontSize : undefined;
  const lineHeight =
    typeof layer.props?.lineHeight === "number" ? layer.props.lineHeight : undefined;
  const fontWeight =
    typeof layer.props?.fontWeight === "number" || typeof layer.props?.fontWeight === "string"
      ? layer.props.fontWeight
      : undefined;
  const fontFamily =
    typeof layer.props?.fontFamily === "string" ? layer.props.fontFamily : undefined;
  const fill =
    copyrightTextColor ?? (typeof layer.props?.fill === "string" ? layer.props.fill : undefined);
  const letterSpacingEm =
    typeof layer.props?.letterSpacingEm === "number" ? layer.props.letterSpacingEm : undefined;
  const align =
    layer.props?.align === "left" ||
    layer.props?.align === "center" ||
    layer.props?.align === "right"
      ? layer.props.align
      : undefined;

  return (
    <Layer key={layer.id} data-layer-type="copyright" {...svgFocusProps}>
      {showTextBounds ? (
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
          stroke="#00e5ff"
          strokeWidth={2}
          data-debug-bounds="true"
        />
      ) : null}
      <CardTextBlock
        text={resolvedText}
        bounds={bounds}
        fontSize={fontSize}
        lineHeight={lineHeight}
        fontWeight={fontWeight}
        fontFamily={fontFamily}
        fill={fill}
        letterSpacingEm={letterSpacingEm}
        align={align}
      />
    </Layer>
  );
}

export function DeveloperCreditLayer({
  blueprint,
  cardData,
  developerCreditEnabled,
}: {
  blueprint: Blueprint;
  cardData?: CardDataByTemplate[TemplateId];
  developerCreditEnabled?: boolean;
}) {
  if (!developerCreditEnabled) return null;
  if (!cardData) return null;

  const style = resolveCopyrightTextStyle(blueprint);
  const fontSize = Math.max(1, Math.round(style.fontSize * DEVELOPER_CREDIT_FONT_SCALE));
  const fontFamily = CARD_TEXT_FONT_FAMILY;
  const fontWeight = "400";
  const x = CARD_WIDTH - DEVELOPER_CREDIT_RIGHT_INSET;
  const effectiveTopInset = Math.max(DEVELOPER_CREDIT_TOP_INSET, CARD_CORNER_RADIUS + 2);
  const { maxLineWidth } = measureCardTextMaxLineWidth({
    text: DEVELOPER_CREDIT_TEXT,
    width: CARD_HEIGHT,
    fontSize,
    lineHeight: fontSize,
    fontFamily,
    fontWeight,
    letterSpacingEm: undefined,
    defaultAlign: "left",
  });
  const y = effectiveTopInset + Math.max(0, Math.floor(maxLineWidth));

  return (
    <Layer data-layer-type="developer-credit">
      <text
        x={0}
        y={0}
        transform={`translate(${x} ${y}) rotate(-90)`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        fill={DEVELOPER_CREDIT_BLEND_COLOR}
        fillOpacity={DEVELOPER_CREDIT_OPACITY}
        style={{ mixBlendMode: DEVELOPER_CREDIT_BLEND_MODE }}
        textAnchor="start"
        dominantBaseline="text-before-edge"
      >
        {DEVELOPER_CREDIT_TEXT}
      </text>
    </Layer>
  );
}
