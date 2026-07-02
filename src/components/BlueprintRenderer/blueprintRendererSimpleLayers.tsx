"use client";

import { useId } from "react";

import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import {
  EDITOR_TARGET_IDS,
  useRegisterHoverAdornment,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { padBounds } from "@/components/Cards/CardEditor/EditorTargetHoverVisual";
import CardBorder from "@/components/Cards/CardParts/CardBorder";
import CardTexturedBorder from "@/components/Cards/CardParts/CardTexturedBorder";
import RibbonTitle from "@/components/Cards/CardParts/RibbonTitle";
import Layer from "@/components/Cards/CardPreview/Layer";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { layerTypes } from "@/data/card-systems/types";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import { normalizeFileProtocolAssetUrl } from "@/lib/browser";
import { computeContainScale } from "@/lib/image-scale";
import type { Blueprint, BlueprintLayer } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import {
  MissingArtworkPlaceholder,
  getLayerBounds,
  normalizeClipId,
} from "./blueprintRendererShared";

import type { StaticImageData } from "next/image";

const IMAGE_HOVER_EDGE_INSET = 18;
const IMAGE_HOVER_RADIUS = 16;
const TREASURE_HOVER_OUTSET = 16;

export function getImageHoverEdgeInset() {
  return IMAGE_HOVER_EDGE_INSET;
}

function intersectRect(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);

  if (right <= left || bottom <= top) return null;

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function buildImageHoverBounds({
  clipMode,
  layerBounds,
  renderedBounds,
  canvasBounds,
}: {
  clipMode: "bounds" | "canvas" | "none";
  layerBounds: { x: number; y: number; width: number; height: number };
  renderedBounds: { x: number; y: number; width: number; height: number } | null;
  canvasBounds: { x: number; y: number; width: number; height: number };
}) {
  if (clipMode !== "canvas" || !renderedBounds) {
    const baseBounds = {
      x: layerBounds.x,
      y: layerBounds.y,
      width: layerBounds.width,
      height: layerBounds.height,
      radius: IMAGE_HOVER_RADIUS,
    };
    return clipMode === "bounds"
      ? {
          ...padBounds(baseBounds, TREASURE_HOVER_OUTSET),
          radius: IMAGE_HOVER_RADIUS,
        }
      : baseBounds;
  }

  const visibleBounds = intersectRect(renderedBounds, canvasBounds);
  if (!visibleBounds) return null;

  const minLeft = canvasBounds.x + IMAGE_HOVER_EDGE_INSET;
  const minTop = canvasBounds.y + IMAGE_HOVER_EDGE_INSET;
  const maxRight = canvasBounds.x + canvasBounds.width - IMAGE_HOVER_EDGE_INSET;
  const maxBottom = canvasBounds.y + canvasBounds.height - IMAGE_HOVER_EDGE_INSET;
  const left = Math.max(visibleBounds.x, minLeft);
  const top = Math.max(visibleBounds.y, minTop);
  const right = Math.min(visibleBounds.x + visibleBounds.width, maxRight);
  const bottom = Math.min(visibleBounds.y + visibleBounds.height, maxBottom);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    radius: IMAGE_HOVER_RADIUS,
  };
}

export function renderBackgroundLayer({
  blueprint,
  layer,
  background,
  backgroundLoaded,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  background?: StaticImageData;
  backgroundLoaded?: boolean;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  if (layer.type !== layerTypes.background) return null;

  const source = "source" in layer ? (layer.source ?? "template") : "template";
  const asset = "asset" in layer ? layer.asset : undefined;
  const image = source === "asset" ? asset : background;
  if (!image) return null;

  const bounds = getLayerBounds(blueprint, layer);
  const tintKey = "tintKey" in layer ? layer.tintKey : undefined;
  const tintValue =
    tintKey && cardData ? (cardData as Record<string, unknown>)[tintKey] : undefined;
  const tint =
    typeof tintValue === "string" && tintValue.trim().length > 0 ? tintValue.trim() : undefined;
  const cutoutBounds = "cutoutBounds" in layer ? layer.cutoutBounds : undefined;
  const maskId = cutoutBounds ? `${blueprint.templateId}-${layer.id}-cutout-mask` : undefined;
  const opacity = backgroundLoaded === false ? 0 : 1;

  return (
    <Layer key={layer.id}>
      {cutoutBounds ? (
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              fill="white"
            />
            <rect
              x={cutoutBounds.x}
              y={cutoutBounds.y}
              width={cutoutBounds.width}
              height={cutoutBounds.height}
              fill="black"
            />
          </mask>
        </defs>
      ) : null}
      <g style={tint ? { isolation: "isolate" } : undefined}>
        <image
          href={normalizeFileProtocolAssetUrl(image.src)}
          data-card-background="true"
          data-template-asset="background"
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          preserveAspectRatio="xMidYMid meet"
          style={{ opacity }}
          mask={maskId ? `url(#${maskId})` : undefined}
        />
        {tint ? (
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill={tint}
            style={{ mixBlendMode: "multiply", opacity }}
            mask={maskId ? `url(#${maskId})` : undefined}
          />
        ) : null}
      </g>
    </Layer>
  );
}

export function renderBorderLayer({
  blueprint,
  layer,
  backgroundLoaded,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  backgroundLoaded?: boolean;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  if (layer.type !== layerTypes.border) return null;

  const bounds = getLayerBounds(blueprint, layer);
  const borderColor =
    cardData && typeof (cardData as { borderColor?: string }).borderColor === "string"
      ? (cardData as { borderColor?: string }).borderColor
      : undefined;
  const borderMask = "mask" in layer ? layer.mask : undefined;
  const borderTexture = "texture" in layer ? layer.texture : undefined;
  const blendMode = "blendMode" in layer ? layer.blendMode : undefined;
  const offsetX = "offsetX" in layer && typeof layer.offsetX === "number" ? layer.offsetX : 0;
  const offsetY = "offsetY" in layer && typeof layer.offsetY === "number" ? layer.offsetY : 0;

  if (borderMask && borderTexture) {
    return (
      <CardTexturedBorder
        key={layer.id}
        alphaMask={borderMask}
        textureMask={borderTexture}
        backgroundLoaded={backgroundLoaded}
        color={borderColor}
        width={bounds.width}
        height={bounds.height}
        blendMode={blendMode}
        offsetX={offsetX}
        offsetY={offsetY}
      />
    );
  }

  return (
    <CardBorder
      key={layer.id}
      mask={borderMask ?? (blueprint.templateId === "labelled-back" ? borderedMask : undefined)}
      backgroundLoaded={backgroundLoaded}
      color={borderColor}
      width={bounds.width}
      height={bounds.height}
      offsetX={offsetX}
      offsetY={offsetY}
    />
  );
}

export function renderOverlayLayer({
  blueprint,
  layer,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
}) {
  if (layer.type !== layerTypes.overlay) return null;
  const overlayLayer = layer as Extract<BlueprintLayer, { type: "overlay" }>;

  const bounds = getLayerBounds(blueprint, layer);
  const preserveAspectRatio =
    typeof layer.props?.preserveAspectRatio === "string"
      ? layer.props.preserveAspectRatio
      : "xMidYMid meet";

  return (
    <Layer key={layer.id}>
      <image
        href={normalizeFileProtocolAssetUrl(overlayLayer.asset.src)}
        data-template-asset="overlay"
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        preserveAspectRatio={preserveAspectRatio}
      />
    </Layer>
  );
}

export function ImageLayer({
  blueprint,
  layer,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  const clipId = normalizeClipId(useId());
  const assetId =
    layer.type === layerTypes.image && layer.bind?.imageKey && cardData
      ? ((cardData as Record<string, unknown>)[layer.bind.imageKey] as string | undefined)
      : undefined;
  const assetName =
    layer.type === layerTypes.image && cardData
      ? ((cardData as { imageAssetName?: string }).imageAssetName as string | undefined)
      : undefined;
  const { url: imageUrl, status: imageStatus } = useAssetImageUrl(assetId);
  const svgFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.imageMain);
  const bounds = layer.type === layerTypes.image ? getLayerBounds(blueprint, layer) : null;
  if (layer.type !== layerTypes.image) return null;
  const imageLayer = layer as Extract<BlueprintLayer, { type: "image" }>;
  const clipMode = imageLayer.clip ?? "bounds";
  const canvasBounds = {
    x: 0,
    y: 0,
    width: blueprint.canvas?.width ?? CARD_WIDTH,
    height: blueprint.canvas?.height ?? CARD_HEIGHT,
  };
  const hasImageBinding = !!layer.bind?.imageKey;
  const hasRenderInputs = hasImageBinding && !!cardData && !!bounds;
  const scale = hasRenderInputs ? ((cardData as { imageScale?: number }).imageScale ?? 1) : 1;
  const scaleMode = hasRenderInputs
    ? ((cardData as { imageScaleMode?: "absolute" | "relative" }).imageScaleMode ?? "relative")
    : "relative";
  const offsetX = hasRenderInputs ? ((cardData as { imageOffsetX?: number }).imageOffsetX ?? 0) : 0;
  const offsetY = hasRenderInputs ? ((cardData as { imageOffsetY?: number }).imageOffsetY ?? 0) : 0;
  const rotation = hasRenderInputs ? ((cardData as { imageRotation?: number }).imageRotation ?? 0) : 0;
  const layerOffsetX = typeof layer.props?.offsetX === "number" ? layer.props.offsetX : 0;
  const layerOffsetY = typeof layer.props?.offsetY === "number" ? layer.props.offsetY : 0;
  const baseWidth =
    hasRenderInputs && bounds
      ? ((cardData as { imageOriginalWidth?: number }).imageOriginalWidth ?? bounds.width)
      : 0;
  const baseHeight =
    hasRenderInputs && bounds
      ? ((cardData as { imageOriginalHeight?: number }).imageOriginalHeight ?? bounds.height)
      : 0;
  const fitScale =
    hasRenderInputs && bounds ? computeContainScale(bounds, baseWidth, baseHeight) : 1;
  const effectiveScale = scaleMode === "relative" ? fitScale * scale : scale;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;
  const x =
    hasRenderInputs && bounds
      ? bounds.x + (bounds.width - scaledWidth) / 2 + offsetX + layerOffsetX
      : 0;
  const y =
    hasRenderInputs && bounds
      ? bounds.y + (bounds.height - scaledHeight) / 2 + offsetY + layerOffsetY
      : 0;
  const hoverBounds =
    bounds == null
      ? null
      : buildImageHoverBounds({
          clipMode,
          layerBounds: bounds,
          renderedBounds:
            hasRenderInputs && imageUrl
              ? {
                  x,
                  y,
                  width: scaledWidth,
                  height: scaledHeight,
                }
              : null,
          canvasBounds,
        });

  useRegisterHoverAdornment(
    EDITOR_TARGET_IDS.imageMain,
    hoverBounds
      ? {
          kind: "rect",
          ...hoverBounds,
        }
      : null,
  );

  if (!layer.bind?.imageKey) return null;
  if (!cardData) return null;
  if (!bounds) return null;
  if (!imageUrl) {
    if (imageStatus === "missing") {
      return (
        <Layer key={layer.id} {...svgFocusProps}>
          <MissingArtworkPlaceholder bounds={bounds} assetName={assetName} scale={2} />
        </Layer>
      );
    }
    return null;
  }

  const cx = x + scaledWidth / 2;
  const cy = y + scaledHeight / 2;
  const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
  const shouldClip = clipMode !== "none";
  const clipBounds = clipMode === "canvas" ? canvasBounds : bounds;

  return (
    <Layer key={layer.id} {...svgFocusProps}>
      {shouldClip ? (
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={clipBounds.x}
              y={clipBounds.y}
              width={clipBounds.width}
              height={clipBounds.height}
            />
          </clipPath>
        </defs>
      ) : null}
      <image
        href={imageUrl}
        data-user-asset-id={assetId}
        data-user-asset-name={assetName}
        x={x}
        y={y}
        width={scaledWidth}
        height={scaledHeight}
        transform={transform}
        preserveAspectRatio="xMidYMid meet"
        clipPath={shouldClip ? `url(#${clipId})` : undefined}
      />
    </Layer>
  );
}

export function ImageLayerHitArea({
  blueprint,
  layer,
  targetId = EDITOR_TARGET_IDS.imageMain,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  targetId?: typeof EDITOR_TARGET_IDS.imageMain | typeof EDITOR_TARGET_IDS.title;
}) {
  const svgFocusProps = useSvgFocusTarget(targetId);

  if (layer.type !== layerTypes.image) return null;

  const bounds = getLayerBounds(blueprint, layer);

  return (
    <Layer {...svgFocusProps}>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        pointerEvents="all"
        data-hqcc-hit-area={targetId}
      />
    </Layer>
  );
}

export function TitleLayerHitArea({
  layer,
  cardData,
  templateName,
  templateId,
}: {
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
  templateName?: string;
  templateId?: TemplateId;
}) {
  const svgFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.title);

  if (layer.type !== "title") return null;

  const showTitle =
    cardData && typeof (cardData as { showTitle?: boolean }).showTitle === "boolean"
      ? (cardData as { showTitle?: boolean }).showTitle
      : true;

  if (!showTitle) return null;

  const titleKey = layer.bind?.titleKey;
  const titleValue =
    titleKey && cardData
      ? ((cardData as Record<string, unknown>)[titleKey] as string | null | undefined)
      : undefined;
  const title = titleValue ?? templateName;
  if (!title) return null;

  const showRibbonDefault =
    typeof layer.props?.showRibbon === "boolean" ? layer.props.showRibbon : true;
  const titleStyle = cardData
    ? (cardData as { titleStyle?: "ribbon" | "plain" }).titleStyle
    : undefined;
  const showRibbon =
    titleStyle === "ribbon" ? true : titleStyle === "plain" ? false : showRibbonDefault;
  const getBound = (prefix: string) => {
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
  const placement =
    templateId === "labelled-back"
      ? (cardData as { titlePlacement?: "top" | "bottom" } | undefined)?.titlePlacement
      : undefined;
  const ribbonBounds = getBound(placement === "top" ? "ribbonTop" : "ribbon");
  const textBounds = getBound(placement === "top" ? "textTop" : "text");
  const textBoundsNoRibbon = getBound(placement === "top" ? "textNoRibbonTop" : "textNoRibbon");
  const baseBounds = showRibbon
    ? ribbonBounds ?? textBounds
    : textBoundsNoRibbon ?? textBounds ?? ribbonBounds;

  if (!baseBounds) return null;

  return (
    <Layer {...svgFocusProps}>
      <rect
        x={baseBounds.x}
        y={baseBounds.y}
        width={baseBounds.width}
        height={baseBounds.height}
        fill="transparent"
        pointerEvents="all"
        data-hqcc-hit-area={EDITOR_TARGET_IDS.title}
      />
    </Layer>
  );
}

export function TitleLayer({
  layer,
  cardData,
  templateName,
  templateId,
}: {
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
  templateName?: string;
  templateId?: TemplateId;
}) {
  if (layer.type !== "title") return null;

  const showTitle =
    cardData && typeof (cardData as { showTitle?: boolean }).showTitle === "boolean"
      ? (cardData as { showTitle?: boolean }).showTitle
      : true;

  if (!showTitle) return null;

  const titleKey = layer.bind?.titleKey;
  const titleValue =
    titleKey && cardData
      ? ((cardData as Record<string, unknown>)[titleKey] as string | null | undefined)
      : undefined;
  const title = titleValue ?? templateName;
  if (!title) return null;

  const showRibbonDefault =
    typeof layer.props?.showRibbon === "boolean" ? layer.props.showRibbon : true;
  const titleStyle = cardData
    ? (cardData as { titleStyle?: "ribbon" | "plain" }).titleStyle
    : undefined;
  const showRibbon =
    titleStyle === "ribbon" ? true : titleStyle === "plain" ? false : showRibbonDefault;
  const titleColor = cardData ? (cardData as { titleColor?: string }).titleColor : undefined;
  const y = typeof layer.props?.y === "number" ? layer.props.y : undefined;
  const getBound = (prefix: string) => {
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
  const placement =
    templateId === "labelled-back"
      ? (cardData as { titlePlacement?: "top" | "bottom" } | undefined)?.titlePlacement
      : undefined;
  const ribbonBounds = getBound(placement === "top" ? "ribbonTop" : "ribbon");
  const textBounds = getBound(placement === "top" ? "textTop" : "text");
  const textBoundsNoRibbon = getBound(placement === "top" ? "textNoRibbonTop" : "textNoRibbon");

  return (
    <RibbonTitle
      title={title}
      showRibbon={showRibbon}
      y={y}
      titleColor={titleColor}
      ribbonBounds={ribbonBounds}
      textBounds={textBounds}
      textBoundsNoRibbon={textBoundsNoRibbon}
    />
  );
}
