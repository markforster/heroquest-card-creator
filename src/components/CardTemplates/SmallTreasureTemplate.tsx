import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import CardTextBlock from "@/components/CardParts/CardTextBlock";
import RibbonTitle from "@/components/CardParts/RibbonTitle";
import Layer from "@/components/CardPreview/Layer";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import { useI18n } from "@/i18n/I18nProvider";
import type { SmallTreasureCardData } from "@/types/card-data";
import type { TemplateRenderProps } from "@/types/templates";

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

const BOUNDS_WIDTH = 500;
const BOUNDS_HEIGHT = 180;
const SMALL_TREASURE_IMAGE_BOUNDS = {
  width: BOUNDS_WIDTH,
  height: BOUNDS_HEIGHT,
  x: (CARD_WIDTH - BOUNDS_WIDTH) / 2,
  y: (CARD_HEIGHT - BOUNDS_HEIGHT) / 2 - 269,
} as const;

const CONTENT_BOUNDS_WIDTH = 500;
const CONTENT_BOUNDS_HEIGHT = 580;
const SMALL_TREASURE_CONTENT_BOUNDS = {
  width: CONTENT_BOUNDS_WIDTH,
  height: CONTENT_BOUNDS_HEIGHT,
  x: (CARD_WIDTH - CONTENT_BOUNDS_WIDTH) / 2,
  y: SMALL_TREASURE_IMAGE_BOUNDS.y + SMALL_TREASURE_IMAGE_BOUNDS.height + 20,
} as const;

const DEBUG_BOUNDS_STROKE = "#4b0a4bff";
const DEBUG_BOUNDS_WIDTH = 5;
const DRAW_IMAGE_BOUNDS = false;
const DRAW_CONTENT_BOUNDS = false;

export default function SmallTreasureTemplate({
  background,
  backgroundLoaded,
  templateName,
  cardData,
}: TemplateRenderProps) {
  const { t } = useI18n();
  const data = (cardData as SmallTreasureCardData | undefined) ?? {};
  const title = data.title || templateName || t("ui.smallArtworkCard");
  const imageUrl = useAssetImageUrl(data.imageAssetId);
  const imageScale = data.imageScale ?? 1;
  const offsetX = data.imageOffsetX ?? 0;
  const offsetY = data.imageOffsetY ?? 0;

  const baseWidth = data.imageOriginalWidth ?? SMALL_TREASURE_IMAGE_BOUNDS.width;
  const baseHeight = data.imageOriginalHeight ?? SMALL_TREASURE_IMAGE_BOUNDS.height;
  const scaledWidth = baseWidth * imageScale;
  const scaledHeight = baseHeight * imageScale;
  const imageX =
    SMALL_TREASURE_IMAGE_BOUNDS.x + (SMALL_TREASURE_IMAGE_BOUNDS.width - scaledWidth) / 2 + offsetX;
  const imageY =
    SMALL_TREASURE_IMAGE_BOUNDS.y +
    (SMALL_TREASURE_IMAGE_BOUNDS.height - scaledHeight) / 2 +
    offsetY;

  return (
    <>
      <Layer>
        <image
          href={whitePaperBackground.src}
          data-card-background="true"
          x={0}
          y={0}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          preserveAspectRatio="xMidYMid meet"
          style={{ opacity: backgroundLoaded ? 1 : 0 }}
        />
      </Layer>
      {imageUrl ? (
        <Layer>
          <image
            href={imageUrl}
            data-user-asset-id={data.imageAssetId}
            x={imageX}
            y={imageY}
            width={scaledWidth}
            height={scaledHeight}
            preserveAspectRatio="xMidYMid slice"
          />
        </Layer>
      ) : null}
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
      </Layer>
      {DRAW_IMAGE_BOUNDS ? (
        <Layer>
          <rect
            x={SMALL_TREASURE_IMAGE_BOUNDS.x}
            y={SMALL_TREASURE_IMAGE_BOUNDS.y}
            width={SMALL_TREASURE_IMAGE_BOUNDS.width}
            height={SMALL_TREASURE_IMAGE_BOUNDS.height}
            fill="none"
            stroke={DEBUG_BOUNDS_STROKE}
            strokeWidth={DEBUG_BOUNDS_WIDTH}
            strokeDasharray="6 4"
          />
        </Layer>
      ) : null}
      {DRAW_CONTENT_BOUNDS ? (
        <Layer>
          <rect
            x={SMALL_TREASURE_CONTENT_BOUNDS.x}
            y={SMALL_TREASURE_CONTENT_BOUNDS.y}
            width={SMALL_TREASURE_CONTENT_BOUNDS.width}
            height={SMALL_TREASURE_CONTENT_BOUNDS.height}
            fill="none"
            stroke={DEBUG_BOUNDS_STROKE}
            strokeWidth={DEBUG_BOUNDS_WIDTH}
            strokeDasharray="6 4"
          />
        </Layer>
      ) : null}
      <Layer>
        <CardTextBlock
          text={data.description}
          bounds={SMALL_TREASURE_CONTENT_BOUNDS}
          fontSize={32}
          letterSpacingEm={0.02}
        />
      </Layer>
      <RibbonTitle title={title} showRibbon={false} />
    </>
  );
}
