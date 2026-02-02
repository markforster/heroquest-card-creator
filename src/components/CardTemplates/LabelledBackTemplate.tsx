import whitePaperBackground from "@/assets/card-backgrounds/white-paper.png";
import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import CardBorder from "@/components/CardParts/CardBorder";
import RibbonTitle from "@/components/CardParts/RibbonTitle";
import Layer from "@/components/CardPreview/Layer";
import { useI18n } from "@/i18n/I18nProvider";
import { useAssetImageUrl } from "@/hooks/useAssetImageUrl";
import type { LabelledBackCardData } from "@/types/card-data";
import type { TemplateRenderProps } from "@/types/templates";

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;

const LABELLED_BACK_IMAGE_BOUNDS = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
  x: 0,
  y: 0,
} as const;

const DEBUG_BOUNDS_STROKE = "#4b0a4bff";
const DEBUG_BOUNDS_WIDTH = 5;
const DRAW_IMAGE_BOUNDS = false;

export default function LabelledBackTemplate({
  background,
  backgroundLoaded,
  templateName,
  cardData,
}: TemplateRenderProps) {
  const { t } = useI18n();
  const data = (cardData as LabelledBackCardData | undefined) ?? {};
  const label = data.title || templateName || t("ui.cardBack");

  const imageUrl = useAssetImageUrl(data.imageAssetId);
  const imageScale = data.imageScale ?? 1;
  const offsetX = data.imageOffsetX ?? 0;
  const offsetY = data.imageOffsetY ?? 0;

  const baseWidth = data.imageOriginalWidth ?? LABELLED_BACK_IMAGE_BOUNDS.width;
  const baseHeight = data.imageOriginalHeight ?? LABELLED_BACK_IMAGE_BOUNDS.height;
  const scaledWidth = baseWidth * imageScale;
  const scaledHeight = baseHeight * imageScale;

  const imageX =
    LABELLED_BACK_IMAGE_BOUNDS.x + (LABELLED_BACK_IMAGE_BOUNDS.width - scaledWidth) / 2 + offsetX;
  const imageY =
    LABELLED_BACK_IMAGE_BOUNDS.y + (LABELLED_BACK_IMAGE_BOUNDS.height - scaledHeight) / 2 + offsetY;

  return (
    <>
      <Layer>
        <image
          href={whitePaperBackground.src}
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
      <CardBorder
        mask={borderedMask}
        backgroundLoaded={backgroundLoaded}
        color={data.borderColor}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
      />
      {DRAW_IMAGE_BOUNDS ? (
        <Layer>
          <rect
            x={LABELLED_BACK_IMAGE_BOUNDS.x}
            y={LABELLED_BACK_IMAGE_BOUNDS.y}
            width={LABELLED_BACK_IMAGE_BOUNDS.width}
            height={LABELLED_BACK_IMAGE_BOUNDS.height}
            fill="none"
            stroke={DEBUG_BOUNDS_STROKE}
            strokeWidth={DEBUG_BOUNDS_WIDTH}
            strokeDasharray="6 4"
          />
        </Layer>
      ) : null}
      <Layer>
        <RibbonTitle title={label} y={850} />
      </Layer>
    </>
  );
}
