"use client";

import { EditorTargetAdornmentLayer } from "@/components/Cards/CardEditor/EditorTargetHoverVisual";
import Layer from "@/components/Cards/CardPreview/Layer";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { layerTypes } from "@/data/card-systems/types";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { StaticImageData } from "next/image";

import { renderGroups } from "./blueprintRendererGroups";
import {
  ImageLayer,
  ImageLayerHitArea,
  TitleLayerHitArea,
  TitleLayer,
  renderBackgroundLayer,
  renderBorderLayer,
  renderOverlayLayer,
} from "./blueprintRendererSimpleLayers";
import {
  CopyrightLayer,
  DeveloperCreditLayer,
  TextLayer,
} from "./blueprintRendererText";
import { DEFAULT_CANVAS } from "./blueprintRendererShared";

type BlueprintRendererProps = {
  templateId?: TemplateId;
  templateName?: string;
  background?: StaticImageData;
  backgroundLoaded?: boolean;
  cardData?: CardDataByTemplate[TemplateId];
  copyrightTextColor?: string;
  developerCreditEnabled?: boolean;
  suppressPreviewOnlyWarnings?: boolean;
};

export default function BlueprintRenderer(props: BlueprintRendererProps) {
  const { templateId, templateName, background, backgroundLoaded } = props;
  const { showTextBounds } = useDebugVisuals();
  if (!templateId) return null;

  const blueprint = blueprintsByTemplateId[templateId];
  if (!blueprint) {
    return (
      <Layer>
        <rect
          x={12}
          y={12}
          width={DEFAULT_CANVAS.width - 24}
          height={DEFAULT_CANVAS.height - 24}
          fill="none"
          stroke="#c6541a"
          strokeWidth={2}
          strokeDasharray="10 6"
        />
        <text
          x={DEFAULT_CANVAS.width / 2}
          y={DEFAULT_CANVAS.height / 2 - 6}
          textAnchor="middle"
          fontSize={20}
          fontFamily="Carter Sans W04, serif"
          fill="#c6541a"
        >
          Blueprint missing
        </text>
        <text
          x={DEFAULT_CANVAS.width / 2}
          y={DEFAULT_CANVAS.height / 2 + 20}
          textAnchor="middle"
          fontSize={16}
          fontFamily="Carter Sans W04, serif"
          fill="#c6541a"
        >
          {templateName ?? templateId}
        </text>
      </Layer>
    );
  }

  const renderTreasureArtworkHitArea =
    blueprint.templateId === "small-treasure" || blueprint.templateId === "large-treasure";
  const treasureArtworkLayer = renderTreasureArtworkHitArea
    ? blueprint.layers.find(
        (layer) => layer.type === layerTypes.image && layer.bind?.imageKey === "imageAssetId",
      )
    : undefined;
  const labelledBackImageLayer =
    blueprint.templateId === "labelled-back"
      ? blueprint.layers.find(
          (layer) => layer.type === layerTypes.image && layer.bind?.imageKey === "imageAssetId",
        )
      : undefined;
  const labelledBackTitleLayer =
    blueprint.templateId === "labelled-back"
      ? blueprint.layers.find((layer) => layer.type === layerTypes.title)
      : undefined;

  return (
    <>
      {blueprint.layers.map((layer) => {
        if (layer.type === layerTypes.background) {
          return renderBackgroundLayer({
            blueprint,
            layer,
            background,
            backgroundLoaded,
            cardData: props.cardData,
          });
        }
        if (layer.type === layerTypes.border) {
          return renderBorderLayer({
            blueprint,
            layer,
            backgroundLoaded,
            cardData: props.cardData,
          });
        }
        if (layer.type === layerTypes.overlay) {
          return renderOverlayLayer({ blueprint, layer });
        }
        if (layer.type === layerTypes.image) {
          return (
            <ImageLayer
              key={layer.id}
              blueprint={blueprint}
              layer={layer}
              cardData={props.cardData}
            />
          );
        }
        if (layer.type === layerTypes.text) {
          return (
            <TextLayer
              key={layer.id}
              blueprint={blueprint}
              layer={layer}
              cardData={props.cardData}
              showTextBounds={showTextBounds}
              suppressPreviewOnlyWarnings={props.suppressPreviewOnlyWarnings}
            />
          );
        }
        if (layer.type === layerTypes.title) {
          return (
            <TitleLayer
              key={layer.id}
              layer={layer}
              cardData={props.cardData}
              templateName={templateName}
              templateId={blueprint.templateId}
            />
          );
        }
        if (layer.type === layerTypes.copyright) {
          return (
            <CopyrightLayer
              key={layer.id}
              blueprint={blueprint}
              layer={layer}
              cardData={props.cardData}
              copyrightTextColor={props.copyrightTextColor}
            />
          );
        }
        return null;
      })}
      {treasureArtworkLayer ? (
        <ImageLayerHitArea blueprint={blueprint} layer={treasureArtworkLayer} />
      ) : null}
      {labelledBackImageLayer ? (
        <ImageLayerHitArea blueprint={blueprint} layer={labelledBackImageLayer} />
      ) : null}
      {labelledBackTitleLayer ? (
        <TitleLayerHitArea
          layer={labelledBackTitleLayer}
          cardData={props.cardData}
          templateName={templateName}
          templateId={blueprint.templateId}
        />
      ) : null}
      <DeveloperCreditLayer
        blueprint={blueprint}
        cardData={props.cardData}
        developerCreditEnabled={props.developerCreditEnabled}
      />
      {renderGroups({
        blueprint,
        cardData: props.cardData,
        showTextBounds,
        suppressPreviewOnlyWarnings: props.suppressPreviewOnlyWarnings,
      })}
      <EditorTargetAdornmentLayer />
    </>
  );
}
