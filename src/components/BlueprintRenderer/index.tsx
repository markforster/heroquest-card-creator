"use client";

import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import CardTextBlock, { layoutCardText } from "@/components/CardParts/CardTextBlock";
import CardBorder from "@/components/CardParts/CardBorder";
import HeroStatsBlock, {
  HERO_STATS_HEIGHT,
  type HeroStats,
} from "@/components/CardParts/HeroStatsBlock";
import MonsterStatsBlock, {
  MONSTER_STATS_HEIGHT,
  type MonsterStats,
} from "@/components/CardParts/MonsterStatsBlock";
import RibbonTitle from "@/components/CardParts/RibbonTitle";
import Layer from "@/components/CardPreview/Layer";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import type { Blueprint, BlueprintGroup, BlueprintLayer } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import type { StaticImageData } from "next/image";

type BlueprintRendererProps = {
  templateId?: TemplateId;
  templateName?: string;
  background?: StaticImageData;
  backgroundLoaded?: boolean;
  cardData?: CardDataByTemplate[TemplateId];
};

const DEFAULT_CANVAS = { width: 750, height: 1050 };

function getLayerBounds(blueprint: Blueprint, layer: BlueprintLayer) {
  return (
    layer.bounds ?? {
      x: 0,
      y: 0,
      width: blueprint.canvas?.width ?? DEFAULT_CANVAS.width,
      height: blueprint.canvas?.height ?? DEFAULT_CANVAS.height,
    }
  );
}

function renderBackgroundLayer({
  blueprint,
  layer,
  background,
  backgroundLoaded,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  background?: StaticImageData;
  backgroundLoaded?: boolean;
}) {
  if (layer.type !== "background") return null;

  const source = "source" in layer ? (layer.source ?? "template") : "template";
  const asset = "asset" in layer ? layer.asset : undefined;
  const image = source === "asset" ? asset : background;
  if (!image) return null;

  const bounds = getLayerBounds(blueprint, layer);
  const opacity = backgroundLoaded === false ? 0 : 1;

  return (
    <Layer key={layer.id}>
      <image
        href={image.src}
        data-card-background="true"
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity }}
      />
    </Layer>
  );
}

function renderBorderLayer({
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

  return (
    <CardBorder
      key={layer.id}
      mask={blueprint.templateId === "labelled-back" ? borderedMask : undefined}
      backgroundLoaded={backgroundLoaded}
      color={borderColor}
      width={bounds.width}
      height={bounds.height}
    />
  );
}

function ImageLayer({
  blueprint,
  layer,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  const assetId =
    layer.type === "image" && layer.bind?.imageKey && cardData
      ? ((cardData as Record<string, unknown>)[layer.bind.imageKey] as string | undefined)
      : undefined;
  const imageUrl = useAssetImageUrl(assetId);

  if (layer.type !== "image") return null;
  if (!layer.bind?.imageKey) return null;
  if (!cardData) return null;
  if (!imageUrl) return null;

  const bounds = getLayerBounds(blueprint, layer);
  const scale = (cardData as { imageScale?: number }).imageScale ?? 1;
  const offsetX = (cardData as { imageOffsetX?: number }).imageOffsetX ?? 0;
  const offsetY = (cardData as { imageOffsetY?: number }).imageOffsetY ?? 0;

  const baseWidth =
    (cardData as { imageOriginalWidth?: number }).imageOriginalWidth ?? bounds.width;
  const baseHeight =
    (cardData as { imageOriginalHeight?: number }).imageOriginalHeight ?? bounds.height;

  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  const x = bounds.x + (bounds.width - scaledWidth) / 2 + offsetX;
  const y = bounds.y + (bounds.height - scaledHeight) / 2 + offsetY;

  return (
    <Layer key={layer.id}>
      <image
        href={imageUrl}
        data-user-asset-id={assetId}
        x={x}
        y={y}
        width={scaledWidth}
        height={scaledHeight}
        preserveAspectRatio="xMidYMid slice"
      />
    </Layer>
  );
}

function TextLayer({
  blueprint,
  layer,
  cardData,
}: {
  blueprint: Blueprint;
  layer: BlueprintLayer;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  if (layer.type !== "text") return null;
  if (!layer.bind?.textKey) return null;
  if (!cardData) return null;

  const text = (cardData as Record<string, unknown>)[layer.bind.textKey];
  if (typeof text !== "string" && text != null) return null;

  if (layer.when?.hasText) {
    const testValue = (cardData as Record<string, unknown>)[layer.when.hasText];
    if (!testValue) return null;
  }

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
  const fill = typeof layer.props?.fill === "string" ? layer.props.fill : undefined;
  const letterSpacingEm =
    typeof layer.props?.letterSpacingEm === "number" ? layer.props.letterSpacingEm : undefined;
  const align =
    layer.props?.align === "left" ||
    layer.props?.align === "center" ||
    layer.props?.align === "right"
      ? layer.props.align
      : undefined;

  return (
    <Layer key={layer.id}>
      <CardTextBlock
        text={text as string | null | undefined}
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

function TitleLayer({
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
    templateId === "labelled-back"
      ? cardData && typeof (cardData as { showTitle?: boolean }).showTitle === "boolean"
        ? (cardData as { showTitle?: boolean }).showTitle
        : true
      : true;

  if (!showTitle) return null;

  const titleKey = layer.bind?.titleKey;
  const titleValue =
    titleKey && cardData
      ? ((cardData as Record<string, unknown>)[titleKey] as string | null | undefined)
      : undefined;
  const title = titleValue ?? templateName;
  if (!title) return null;

  const showRibbon = typeof layer.props?.showRibbon === "boolean" ? layer.props.showRibbon : true;
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
  const ribbonBounds = getBound("ribbon");
  const textBounds = getBound("text");
  const textBoundsNoRibbon = getBound("textNoRibbon");

  return (
    <RibbonTitle
      title={title}
      showRibbon={showRibbon}
      y={y}
      ribbonBounds={ribbonBounds}
      textBounds={textBounds}
      textBoundsNoRibbon={textBoundsNoRibbon}
    />
  );
}

function getHeroStats(cardData?: CardDataByTemplate[TemplateId]): HeroStats | undefined {
  if (!cardData) return undefined;
  const data = cardData as {
    attackDice?: HeroStats["attackDice"];
    defendDice?: HeroStats["defendDice"];
    bodyPoints?: HeroStats["bodyPoints"];
    mindPoints?: HeroStats["mindPoints"];
  };

  const hasCustomStats =
    data.attackDice != null ||
    data.defendDice != null ||
    data.bodyPoints != null ||
    data.mindPoints != null;

  if (!hasCustomStats) return undefined;

  return {
    attackDice: data.attackDice ?? 3,
    defendDice: data.defendDice ?? 2,
    bodyPoints: data.bodyPoints ?? 8,
    mindPoints: data.mindPoints ?? 2,
  };
}

function getMonsterStats(cardData?: CardDataByTemplate[TemplateId]): MonsterStats | undefined {
  if (!cardData) return undefined;
  const data = cardData as {
    movementSquares?: MonsterStats["movementSquares"];
    attackDice?: MonsterStats["attackDice"];
    defendDice?: MonsterStats["defendDice"];
    bodyPoints?: MonsterStats["bodyPoints"];
    mindPoints?: MonsterStats["mindPoints"];
  };

  const hasCustomStats =
    data.movementSquares != null ||
    data.attackDice != null ||
    data.defendDice != null ||
    data.bodyPoints != null ||
    data.mindPoints != null;

  if (!hasCustomStats) return undefined;

  return {
    movementSquares: data.movementSquares ?? 0,
    attackDice: data.attackDice ?? 0,
    defendDice: data.defendDice ?? 0,
    bodyPoints: data.bodyPoints ?? 0,
    mindPoints: data.mindPoints ?? 0,
  };
}

type GroupItem = {
  id: string;
  height: number;
  render: (topY: number) => JSX.Element | null;
};

function buildGroupItems({
  group,
  cardData,
}: {
  group: BlueprintGroup;
  cardData?: CardDataByTemplate[TemplateId];
}): GroupItem[] {
  const items: GroupItem[] = [];

  group.children.forEach((child) => {
    if (child.type === "text") {
      const textKey = child.bind?.textKey;
      const textValue =
        textKey && cardData
          ? ((cardData as Record<string, unknown>)[textKey] as string | null | undefined)
          : undefined;

      const text = typeof textValue === "string" ? textValue : "";
      if (!text.trim()) return;

      const fontSize = typeof child.props?.fontSize === "number" ? child.props.fontSize : 22;
      const lineHeight =
        typeof child.props?.lineHeight === "number" ? child.props.lineHeight : undefined;
      const fontFamily =
        typeof child.props?.fontFamily === "string" ? child.props.fontFamily : undefined;

      const { lines, lineHeight: measuredLineHeight } = layoutCardText({
        text,
        width: group.width,
        fontSize,
        lineHeight,
        fontFamily,
      });

      if (!lines.length) return;

      const height = lines.length * measuredLineHeight;
      const fontWeight =
        typeof child.props?.fontWeight === "number" || typeof child.props?.fontWeight === "string"
          ? child.props.fontWeight
          : undefined;
      const fill = typeof child.props?.fill === "string" ? child.props.fill : undefined;
      const letterSpacingEm =
        typeof child.props?.letterSpacingEm === "number" ? child.props.letterSpacingEm : undefined;
      const align =
        child.props?.align === "left" ||
        child.props?.align === "center" ||
        child.props?.align === "right"
          ? child.props.align
          : undefined;

      items.push({
        id: child.id,
        height,
        render: (topY) => (
          <Layer key={child.id}>
            <CardTextBlock
              text={text}
              bounds={{ x: group.origin.x, y: topY, width: group.width, height }}
              fontSize={fontSize}
              lineHeight={measuredLineHeight}
              fontWeight={fontWeight}
              fontFamily={fontFamily}
              fill={fill}
              letterSpacingEm={letterSpacingEm}
              align={align}
            />
          </Layer>
        ),
      });
      return;
    }

    if (child.type === "stats-hero") {
      const height =
        typeof child.props?.height === "number" ? child.props.height : HERO_STATS_HEIGHT;
      const stats = getHeroStats(cardData);

      items.push({
        id: child.id,
        height,
        render: (topY) => <HeroStatsBlock key={child.id} stats={stats} y={topY} />,
      });
      return;
    }

    if (child.type === "stats-monster") {
      const height =
        typeof child.props?.height === "number" ? child.props.height : MONSTER_STATS_HEIGHT;
      const stats = getMonsterStats(cardData);

      items.push({
        id: child.id,
        height,
        render: (topY) => <MonsterStatsBlock key={child.id} stats={stats} y={topY} />,
      });
      return;
    }

    if (child.type === "icon") {
      const iconKey = child.bind?.iconKey;
      const iconId =
        iconKey && cardData
          ? ((cardData as Record<string, unknown>)[iconKey] as string | null | undefined)
          : undefined;

      if (child.when?.hasImage) {
        const testValue = cardData
          ? ((cardData as Record<string, unknown>)[child.when.hasImage] as
              | string
              | null
              | undefined)
          : undefined;
        if (!testValue) return;
      }

      if (!iconId) return;

      const size = typeof child.props?.size === "number" ? child.props.size : 140;
      const offsetX = typeof child.props?.offsetX === "number" ? child.props.offsetX : 0;
      const x = group.origin.x + offsetX;

      items.push({
        id: child.id,
        height: size,
        render: (topY) => (
          <GroupIconLayer key={child.id} assetId={iconId} x={x} y={topY} size={size} />
        ),
      });
    }
  });

  return items;
}

function GroupIconLayer({
  assetId,
  x,
  y,
  size,
}: {
  assetId: string;
  x: number;
  y: number;
  size: number;
}) {
  const imageUrl = useAssetImageUrl(assetId);
  if (!imageUrl) return null;

  return (
    <Layer>
      <image
        href={imageUrl}
        data-user-asset-id={assetId}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
      />
    </Layer>
  );
}

function renderGroups({
  blueprint,
  cardData,
}: {
  blueprint: Blueprint;
  cardData?: CardDataByTemplate[TemplateId];
}) {
  if (!blueprint.groups?.length) return null;

  return blueprint.groups.flatMap((group) => {
    if (group.type !== "stack" || group.anchor !== "bottom" || group.direction !== "up") {
      return null;
    }

    const items = buildGroupItems({ group, cardData });
    let cursor = group.origin.y;

    return items.map((item) => {
      const topY = cursor - item.height;
      cursor = topY - group.gap;
      return item.render(topY);
    });
  });
}

export default function BlueprintRenderer(props: BlueprintRendererProps) {
  const { templateId, templateName, background, backgroundLoaded } = props;
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
          fontFamily="Carter Sans W01, serif"
          fill="#c6541a"
        >
          Blueprint missing
        </text>
        <text
          x={DEFAULT_CANVAS.width / 2}
          y={DEFAULT_CANVAS.height / 2 + 20}
          textAnchor="middle"
          fontSize={16}
          fontFamily="Carter Sans W01, serif"
          fill="#c6541a"
        >
          {templateName ?? templateId}
        </text>
      </Layer>
    );
  }

  return (
    <>
      {blueprint.layers.map((layer) => {
        if (layer.type === "background") {
          return renderBackgroundLayer({ blueprint, layer, background, backgroundLoaded });
        }
        if (layer.type === "border") {
          return renderBorderLayer({
            blueprint,
            layer,
            backgroundLoaded,
            cardData: props.cardData,
          });
        }
        if (layer.type === "image") {
          return (
            <ImageLayer
              key={layer.id}
              blueprint={blueprint}
              layer={layer}
              cardData={props.cardData}
            />
          );
        }
        if (layer.type === "text") {
          return (
            <TextLayer
              key={layer.id}
              blueprint={blueprint}
              layer={layer}
              cardData={props.cardData}
            />
          );
        }
        if (layer.type === "title") {
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
        return null;
      })}
      {renderGroups({ blueprint, cardData: props.cardData })}
    </>
  );
}
