import CardTextBlock, { layoutCardText } from "@/components/CardParts/CardTextBlock";
import HeroStatsBlock, { HERO_STATS_HEIGHT } from "@/components/CardParts/HeroStatsBlock";
import RibbonTitle from "@/components/CardParts/RibbonTitle";
import Layer from "@/components/CardPreview/Layer";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import type { HeroCardData } from "@/types/card-data";
import type { TemplateRenderProps } from "@/types/templates";

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

const HERO_IMAGE_BOUNDS = {
  width: 730,
  height: 730,
  x: (CARD_WIDTH - 730) / 2,
  y: (CARD_HEIGHT - 730) / 2 - 40,
} as const;

const HERO_CONTENT_WIDTH = 620;
// Bottom edge of hero content area (previously y 820 with fixed height 180 => bottom at 1000)
const HERO_CONTENT_BOTTOM_Y = 1020;
const HERO_CONTENT_X = (CARD_WIDTH - HERO_CONTENT_WIDTH) / 2;
const HERO_CONTENT_FONT_SIZE = 26;
const HERO_STATS_GAP = 2;

const DEBUG_BOUNDS_STROKE = "#4b0a4bff";
const DEBUG_BOUNDS_WIDTH = 5;

const DRAW_IMAGE_BOUNDS = false;
const DRAW_CONTENT_BOUNDS = false;

export default function HeroCardTemplate({
  background,
  backgroundLoaded,
  templateName,
  cardData,
}: TemplateRenderProps) {
  const heroData = (cardData as HeroCardData | undefined) ?? {};
  const title = heroData.title || templateName || "Hero";

  const hasCustomStats =
    heroData.attackDice != null ||
    heroData.defendDice != null ||
    heroData.bodyPoints != null ||
    heroData.mindPoints != null;

  const stats = hasCustomStats
    ? {
        attackDice: heroData.attackDice ?? 3,
        defendDice: heroData.defendDice ?? 2,
        bodyPoints: heroData.bodyPoints ?? 8,
        mindPoints: heroData.mindPoints ?? 2,
      }
    : undefined;

  const imageUrl = useAssetImageUrl(heroData.imageAssetId);
  const imageScale = heroData.imageScale ?? 1;
  const offsetX = heroData.imageOffsetX ?? 0;
  const offsetY = heroData.imageOffsetY ?? 0;

  const baseWidth = heroData.imageOriginalWidth ?? HERO_IMAGE_BOUNDS.width;
  const baseHeight = heroData.imageOriginalHeight ?? HERO_IMAGE_BOUNDS.height;
  const scaledWidth = baseWidth * imageScale;
  const scaledHeight = baseHeight * imageScale;
  const imageX = HERO_IMAGE_BOUNDS.x + (HERO_IMAGE_BOUNDS.width - scaledWidth) / 2 + offsetX;
  const imageY = HERO_IMAGE_BOUNDS.y + (HERO_IMAGE_BOUNDS.height - scaledHeight) / 2 + offsetY;

  const description = heroData.description ?? "";
  const { lines: heroContentLines, lineHeight: heroLineHeight } = layoutCardText({
    text: description,
    width: HERO_CONTENT_WIDTH,
    fontSize: HERO_CONTENT_FONT_SIZE,
  });
  const contentLineCount = heroContentLines.length;
  const contentHeight = contentLineCount * heroLineHeight;
  const contentBottomY = HERO_CONTENT_BOTTOM_Y;
  const contentTopY = contentBottomY - contentHeight;
  const statsBottomY = contentTopY - HERO_STATS_GAP;
  const statsY = statsBottomY - HERO_STATS_HEIGHT;

  return (
    <Layer>
      <image
        href={background.src}
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
          x={imageX}
          y={imageY}
          width={scaledWidth}
          height={scaledHeight}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {DRAW_IMAGE_BOUNDS ? (
        <rect
          x={HERO_IMAGE_BOUNDS.x}
          y={HERO_IMAGE_BOUNDS.y}
          width={HERO_IMAGE_BOUNDS.width}
          height={HERO_IMAGE_BOUNDS.height}
          fill="none"
          stroke={DEBUG_BOUNDS_STROKE}
          strokeWidth={DEBUG_BOUNDS_WIDTH}
          strokeDasharray="6 4"
        />
      ) : null}
      <RibbonTitle title={title} />
      <HeroStatsBlock stats={stats} y={statsY} />
      <CardTextBlock
        text={description}
        bounds={{
          x: HERO_CONTENT_X,
          y: contentTopY,
          width: HERO_CONTENT_WIDTH,
          height: contentHeight,
        }}
        fontSize={HERO_CONTENT_FONT_SIZE}
        fontWeight={550}
      />
      {DRAW_CONTENT_BOUNDS ? (
        <rect
          x={HERO_CONTENT_X}
          y={contentTopY}
          width={HERO_CONTENT_WIDTH}
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
