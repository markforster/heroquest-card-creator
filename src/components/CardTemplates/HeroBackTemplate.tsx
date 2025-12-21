import CardTextBlock from "@/components/CardParts/CardTextBlock";
import Layer from "@/components/CardPreview/Layer";
import type { HeroBackCardData } from "@/types/card-data";
import type { TemplateRenderProps } from "@/types/templates";

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

const CONTENT_BOUNDS_WIDTH = 580;
const CONTENT_BOUNDS_HEIGHT = 480;

const HERO_BACK_CONTENT_BOUNDS = {
  width: CONTENT_BOUNDS_WIDTH,
  height: CONTENT_BOUNDS_HEIGHT,
  x: (CARD_WIDTH - CONTENT_BOUNDS_WIDTH) / 2,
  y: (CARD_HEIGHT - CONTENT_BOUNDS_HEIGHT) / 2 + 18,
} as const;

const DEBUG_BOUNDS_STROKE = "#4b0a4bff";
const DEBUG_BOUNDS_WIDTH = 5;
const DRAW_CONTENT_BOUNDS = false;

export default function HeroBackTemplate({
  background,
  backgroundLoaded,
  cardData,
}: TemplateRenderProps) {
  const data = (cardData as HeroBackCardData | undefined) ?? {};

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
      {/* <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#222"
        fontSize="32"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >
        {title}
      </text> */}
      <CardTextBlock
        text={data.description}
        bounds={HERO_BACK_CONTENT_BOUNDS}
        fontSize={34}
        letterSpacingEm={0.02}
        align="center"
      />
      {DRAW_CONTENT_BOUNDS ? (
        <rect
          x={HERO_BACK_CONTENT_BOUNDS.x}
          y={HERO_BACK_CONTENT_BOUNDS.y}
          width={HERO_BACK_CONTENT_BOUNDS.width}
          height={HERO_BACK_CONTENT_BOUNDS.height}
          fill="none"
          stroke={DEBUG_BOUNDS_STROKE}
          strokeWidth={DEBUG_BOUNDS_WIDTH}
          strokeDasharray="6 4"
        />
      ) : null}
    </Layer>
  );
}
