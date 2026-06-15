"use client";

import { useId } from "react";

import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import CardBorder from "@/components/Cards/CardParts/CardBorder";
import CardTexturedBorder from "@/components/Cards/CardParts/CardTexturedBorder";
import RibbonTitle from "@/components/Cards/CardParts/RibbonTitle";
import Layer from "@/components/Cards/CardPreview/Layer";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
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
  if (layer.type !== "background") return null;

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
  if (layer.type !== "border") return null;

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
  if (layer.type !== "overlay") return null;
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
    layer.type === "image" && layer.bind?.imageKey && cardData
      ? ((cardData as Record<string, unknown>)[layer.bind.imageKey] as string | undefined)
      : undefined;
  const assetName =
    layer.type === "image" && cardData
      ? ((cardData as { imageAssetName?: string }).imageAssetName as string | undefined)
      : undefined;
  const { url: imageUrl, status: imageStatus } = useAssetImageUrl(assetId);

  if (layer.type !== "image") return null;
  const imageLayer = layer as Extract<BlueprintLayer, { type: "image" }>;
  if (!layer.bind?.imageKey) return null;
  if (!cardData) return null;
  const bounds = getLayerBounds(blueprint, layer);
  if (!imageUrl) {
    if (imageStatus === "missing") {
      return <MissingArtworkPlaceholder bounds={bounds} assetName={assetName} scale={2} />;
    }
    return null;
  }

  const scale = (cardData as { imageScale?: number }).imageScale ?? 1;
  const scaleMode =
    (cardData as { imageScaleMode?: "absolute" | "relative" }).imageScaleMode ?? "relative";
  const offsetX = (cardData as { imageOffsetX?: number }).imageOffsetX ?? 0;
  const offsetY = (cardData as { imageOffsetY?: number }).imageOffsetY ?? 0;
  const rotation = (cardData as { imageRotation?: number }).imageRotation ?? 0;
  const layerOffsetX = typeof layer.props?.offsetX === "number" ? layer.props.offsetX : 0;
  const layerOffsetY = typeof layer.props?.offsetY === "number" ? layer.props.offsetY : 0;

  const baseWidth =
    (cardData as { imageOriginalWidth?: number }).imageOriginalWidth ?? bounds.width;
  const baseHeight =
    (cardData as { imageOriginalHeight?: number }).imageOriginalHeight ?? bounds.height;

  const fitScale = computeContainScale(bounds, baseWidth, baseHeight);
  const effectiveScale = scaleMode === "relative" ? fitScale * scale : scale;
  const scaledWidth = baseWidth * effectiveScale;
  const scaledHeight = baseHeight * effectiveScale;

  const x = bounds.x + (bounds.width - scaledWidth) / 2 + offsetX + layerOffsetX;
  const y = bounds.y + (bounds.height - scaledHeight) / 2 + offsetY + layerOffsetY;
  const cx = x + scaledWidth / 2;
  const cy = y + scaledHeight / 2;
  const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
  const clipMode = imageLayer.clip ?? "bounds";
  const shouldClip = clipMode !== "none";
  const clipBounds =
    clipMode === "canvas"
      ? {
          x: 0,
          y: 0,
          width: blueprint.canvas?.width ?? CARD_WIDTH,
          height: blueprint.canvas?.height ?? CARD_HEIGHT,
        }
      : bounds;

  return (
    <Layer key={layer.id}>
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
