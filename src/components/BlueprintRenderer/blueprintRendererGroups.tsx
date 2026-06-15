"use client";

import CardTextBlock, { layoutCardText } from "@/components/Cards/CardParts/CardTextBlock";
import HeroStatsBlock, {
  HERO_STATS_HEIGHT,
  type HeroStats,
} from "@/components/Cards/CardParts/HeroStatsBlock";
import MonsterStatsBlock, {
  MONSTER_STATS_HEIGHT,
  type MonsterStats,
} from "@/components/Cards/CardParts/MonsterStatsBlock";
import Layer from "@/components/Cards/CardPreview/Layer";
import { DEFAULT_BODY_TEXT_COLOR } from "@/config/colors";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import type { Blueprint, BlueprintGroup } from "@/types/blueprints";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import { DEFAULT_CANVAS, MissingArtworkPlaceholder } from "./blueprintRendererShared";

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

function GroupIconLayer({
  assetId,
  assetName,
  x,
  y,
  size,
  scale,
  rotation,
}: {
  assetId: string;
  assetName?: string;
  x: number;
  y: number;
  size: number;
  scale: number;
  rotation: number;
}) {
  const { url: imageUrl, status: imageStatus } = useAssetImageUrl(assetId);
  if (!imageUrl) {
    if (imageStatus === "missing") {
      return (
        <MissingArtworkPlaceholder
          bounds={{ x, y, width: size, height: size }}
          assetName={assetName}
          scale={1}
        />
      );
    }
    return null;
  }

  const cx = x + size / 2;
  const cy = y + size / 2;
  const transform =
    scale !== 1 || rotation !== 0
      ? `translate(${cx} ${cy}) rotate(${rotation}) scale(${scale}) translate(${-cx} ${-cy})`
      : undefined;

  return (
    <Layer>
      <image
        href={imageUrl}
        data-user-asset-id={assetId}
        data-user-asset-name={assetName}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        transform={transform}
      />
    </Layer>
  );
}

function buildGroupItems({
  group,
  cardData,
  blueprint,
  showTextBounds = false,
}: {
  group: BlueprintGroup;
  cardData?: CardDataByTemplate[TemplateId];
  blueprint: Blueprint;
  showTextBounds?: boolean;
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
      const layerFill = typeof child.props?.fill === "string" ? child.props.fill : undefined;
      const bodyTextColor =
        textKey === "description"
          ? ((cardData as { bodyTextColor?: string }).bodyTextColor ?? DEFAULT_BODY_TEXT_COLOR)
          : undefined;
      const fill = bodyTextColor ?? layerFill;
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
              debug={showTextBounds}
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
      const iconName = cardData
        ? ((cardData as { iconAssetName?: string }).iconAssetName as string | undefined)
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
      const offsetY = typeof child.props?.offsetY === "number" ? child.props.offsetY : 0;
      const baseX = group.origin.x + offsetX;
      const normalizedOffsetX =
        typeof (cardData as Record<string, unknown>)?.iconOffsetX === "number"
          ? Number((cardData as Record<string, unknown>).iconOffsetX)
          : 0;
      const normalizedOffsetY =
        typeof (cardData as Record<string, unknown>)?.iconOffsetY === "number"
          ? Number((cardData as Record<string, unknown>).iconOffsetY)
          : 0;
      const iconScale =
        typeof (cardData as Record<string, unknown>)?.iconScale === "number"
          ? Number((cardData as Record<string, unknown>).iconScale)
          : 1;
      const iconRotation =
        typeof (cardData as Record<string, unknown>)?.iconRotation === "number"
          ? Number((cardData as Record<string, unknown>).iconRotation)
          : 0;

      const canvasWidth = blueprint.canvas?.width ?? DEFAULT_CANVAS.width;
      const rightInset = baseX;
      const rightEdgeTarget = canvasWidth - rightInset;
      const titleLayer = blueprint.layers?.find((layer) => layer.id === "title");
      const ribbonY = typeof titleLayer?.props?.ribbonY === "number" ? titleLayer.props.ribbonY : 0;
      const ribbonHeight =
        typeof titleLayer?.props?.ribbonHeight === "number" ? titleLayer.props.ribbonHeight : 0;
      const ribbonBottom = ribbonY + ribbonHeight;
      const verticalTarget = ribbonBottom + 8;

      const maxRight = Math.max(0, rightEdgeTarget - size - baseX);
      const deltaX = normalizedOffsetX * maxRight;
      const x = baseX + deltaX;

      items.push({
        id: child.id,
        height: size,
        render: (topY) => (
          <GroupIconLayer
            key={child.id}
            assetId={iconId}
            assetName={iconName}
            x={x}
            y={(() => {
              const baseTop = topY + offsetY;
              const maxUp = Math.max(0, baseTop - verticalTarget);
              const deltaY = -normalizedOffsetY * maxUp;
              return baseTop + deltaY;
            })()}
            size={size}
            scale={iconScale}
            rotation={iconRotation}
          />
        ),
      });
    }
  });

  return items;
}

export function renderGroups({
  blueprint,
  cardData,
  showTextBounds = false,
}: {
  blueprint: Blueprint;
  cardData?: CardDataByTemplate[TemplateId];
  showTextBounds?: boolean;
}) {
  if (!blueprint.groups?.length) return null;

  return blueprint.groups.flatMap((group) => {
    if (group.type !== "stack" || group.anchor !== "bottom" || group.direction !== "up") {
      return null;
    }

    const items = buildGroupItems({ group, cardData, blueprint, showTextBounds });
    let cursor = group.origin.y;

    return items.map((item) => {
      const topY = cursor - item.height;
      cursor = topY - group.gap;
      return item.render(topY);
    });
  });
}
