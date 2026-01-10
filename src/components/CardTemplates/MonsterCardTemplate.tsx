import CardTextBlock, { layoutCardText } from "@/components/CardParts/CardTextBlock";
import MonsterStatsBlock, { MONSTER_STATS_HEIGHT } from "@/components/CardParts/MonsterStatsBlock";
import RibbonTitle from "@/components/CardParts/RibbonTitle";
import Layer from "@/components/CardPreview/Layer";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import type { MonsterCardData } from "@/types/card-data";
import type { TemplateRenderProps } from "@/types/templates";

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

const MONSTER_IMAGE_BOUNDS = {
  width: 730,
  height: 730,
  x: (CARD_WIDTH - 730) / 2,
  y: (CARD_HEIGHT - 730) / 2 - 40,
} as const;

const MONSTER_ICON_SIZE = 140;
const MONSTER_ICON_GAP = 2;

const MONSTER_CONTENT_WIDTH = 620;
const MONSTER_CONTENT_BOTTOM_Y = 1020;
const MONSTER_CONTENT_X = (CARD_WIDTH - MONSTER_CONTENT_WIDTH) / 2;
const MONSTER_CONTENT_FONT_SIZE = 26;
const MONSTER_STATS_GAP = 2;

const DEBUG_BOUNDS_STROKE = "#4b0a4bff";
const DEBUG_BOUNDS_WIDTH = 5;

const DRAW_IMAGE_BOUNDS = false;
const DRAW_CONTENT_BOUNDS = false;

export default function MonsterCardTemplate({
  background,
  backgroundLoaded,
  templateName,
  cardData,
}: TemplateRenderProps) {
  const monsterData = (cardData as MonsterCardData | undefined) ?? {};
  const title = monsterData.title || templateName || "Monster";

  const hasCustomStats =
    monsterData.movementSquares != null ||
    monsterData.attackDice != null ||
    monsterData.defendDice != null ||
    monsterData.bodyPoints != null ||
    monsterData.mindPoints != null;

  const stats = hasCustomStats
    ? {
        movementSquares: monsterData.movementSquares ?? 0,
        attackDice: monsterData.attackDice ?? 0,
        defendDice: monsterData.defendDice ?? 0,
        bodyPoints: monsterData.bodyPoints ?? 0,
        mindPoints: monsterData.mindPoints ?? 0,
      }
    : undefined;

  const imageUrl = useAssetImageUrl(monsterData.imageAssetId);
  const imageScale = monsterData.imageScale ?? 1;
  const offsetX = monsterData.imageOffsetX ?? 0;
  const offsetY = monsterData.imageOffsetY ?? 0;

  const baseWidth = monsterData.imageOriginalWidth ?? MONSTER_IMAGE_BOUNDS.width;
  const baseHeight = monsterData.imageOriginalHeight ?? MONSTER_IMAGE_BOUNDS.height;
  const scaledWidth = baseWidth * imageScale;
  const scaledHeight = baseHeight * imageScale;
  const imageX = MONSTER_IMAGE_BOUNDS.x + (MONSTER_IMAGE_BOUNDS.width - scaledWidth) / 2 + offsetX;
  const imageY =
    MONSTER_IMAGE_BOUNDS.y + (MONSTER_IMAGE_BOUNDS.height - scaledHeight) / 2 + offsetY;

  const description = monsterData.description ?? "";
  const { lines: monsterContentLines, lineHeight: monsterLineHeight } = layoutCardText({
    text: description,
    width: MONSTER_CONTENT_WIDTH,
    fontSize: MONSTER_CONTENT_FONT_SIZE,
  });
  const contentLineCount = monsterContentLines.length;
  const contentHeight = contentLineCount * monsterLineHeight;
  const contentBottomY = MONSTER_CONTENT_BOTTOM_Y;
  const contentTopY = contentBottomY - contentHeight;
  const statsBottomY = contentTopY - MONSTER_STATS_GAP;
  const statsY = statsBottomY - MONSTER_STATS_HEIGHT;

  const iconUrl = useAssetImageUrl(monsterData.iconAssetId);
  // const iconX = (CARD_WIDTH - MONSTER_ICON_SIZE) / 2;
  const iconX = MONSTER_IMAGE_BOUNDS.x + 66;
  const iconY = statsY - MONSTER_ICON_GAP - MONSTER_ICON_SIZE;

  return (
    <Layer>
      <image
        href={background.src}
        data-card-background="true"
        x={0}
        y={0}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity: backgroundLoaded ? 1 : 0 }}
      />
      {imageUrl ? (
        <image
          href={imageUrl}
          data-user-asset-id={monsterData.imageAssetId}
          x={imageX}
          y={imageY}
          width={scaledWidth}
          height={scaledHeight}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {iconUrl ? (
        <image
          href={iconUrl}
          data-user-asset-id={monsterData.iconAssetId}
          x={iconX}
          y={iconY}
          width={MONSTER_ICON_SIZE}
          height={MONSTER_ICON_SIZE}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}
      {DRAW_IMAGE_BOUNDS ? (
        <rect
          x={MONSTER_IMAGE_BOUNDS.x}
          y={MONSTER_IMAGE_BOUNDS.y}
          width={MONSTER_IMAGE_BOUNDS.width}
          height={MONSTER_IMAGE_BOUNDS.height}
          fill="none"
          stroke={DEBUG_BOUNDS_STROKE}
          strokeWidth={DEBUG_BOUNDS_WIDTH}
          strokeDasharray="6 4"
        />
      ) : null}
      <RibbonTitle title={title} />
      <MonsterStatsBlock stats={stats} y={statsY} />
      <CardTextBlock
        text={description}
        bounds={{
          x: MONSTER_CONTENT_X,
          y: contentTopY,
          width: MONSTER_CONTENT_WIDTH,
          height: contentHeight,
        }}
        fontSize={MONSTER_CONTENT_FONT_SIZE}
        fontWeight={550}
      />
      {DRAW_CONTENT_BOUNDS ? (
        <rect
          x={MONSTER_CONTENT_X}
          y={contentTopY}
          width={MONSTER_CONTENT_WIDTH}
          height={contentHeight}
          fill="none"
          stroke={DEBUG_BOUNDS_STROKE}
          strokeWidth={DEBUG_BOUNDS_WIDTH}
          strokeDasharray="6 4"
        />
      ) : null}
    </Layer>
  );
}
