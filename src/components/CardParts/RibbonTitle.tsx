import ribbon from "@/assets/card-parts/ribbon.png";
import Layer from "@/components/CardPreview/Layer";
import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
import {
  NONRIBBON_TITLE_WEIGHT,
  TITLE_VERTICAL_SCALE_Y,
  USE_BOLD_TITLE_WEIGHT,
  USE_LIGHTER_NONRIBBON_TITLE_WEIGHT,
  USE_TIGHTER_TITLE_TRACKING,
  USE_TITLE_STROKE,
  USE_TITLE_VERTICAL_COMPRESSION,
} from "@/config/flags";
import { isTextBoundsDebugEnabled } from "@/lib/debug-flags";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";
import fitText from "@/lib/text-fitting/fitText";

type RibbonTitleProps = {
  title: string;
  y?: number;
  showRibbon?: boolean;
  ribbonBounds?: { x: number; y: number; width: number; height: number };
  textBounds?: { x: number; y: number; width: number; height: number };
  textBoundsNoRibbon?: { x: number; y: number; width: number; height: number };
};

const CARD_WIDTH = 750;
const SCALE = 1.05;
const RIBBON_WIDTH = 560 * SCALE;
const RIBBON_HEIGHT = 143 * SCALE;
const DEFAULT_Y = 46;

const TITLE_LETTER_SPACING = -0.5;

export default function RibbonTitle({
  title,
  y = DEFAULT_Y,
  showRibbon = true,
  ribbonBounds,
  textBounds,
  textBoundsNoRibbon,
}: RibbonTitleProps) {
  const x = (CARD_WIDTH - RIBBON_WIDTH) / 2;
  const ribbonBox = {
    x,
    y,
    width: RIBBON_WIDTH,
    height: RIBBON_HEIGHT,
  };
  const resolvedRibbonBounds = ribbonBounds ?? ribbonBox;
  const resolvedTextBounds = showRibbon
    ? (textBounds ?? resolvedRibbonBounds)
    : (textBoundsNoRibbon ?? textBounds ?? resolvedRibbonBounds);
  const centerX = resolvedTextBounds.x + resolvedTextBounds.width / 2;
  const centerY = resolvedTextBounds.y + resolvedTextBounds.height / 2;
  const { preferences } = useTextFittingPreferences();
  const titleLayout = fitText(
    "title",
    title,
    {
      width: resolvedTextBounds.width,
      height: resolvedTextBounds.height,
    },
    preferences.title,
  );
  const titleLines = titleLayout.lines.length ? titleLayout.lines : [""];
  const titleFontSize = titleLayout.fontSize;
  const titleLineHeight = titleLayout.lineHeight ?? titleFontSize * 1.05;
  const totalTitleHeight = titleLineHeight * titleLines.length;
  const firstLineY = centerY - (totalTitleHeight - titleLineHeight) / 2;
  const showDebugBounds = isTextBoundsDebugEnabled();
  const letterSpacing = USE_TIGHTER_TITLE_TRACKING ? TITLE_LETTER_SPACING : undefined;
  const scaleY = USE_TITLE_VERTICAL_COMPRESSION ? TITLE_VERTICAL_SCALE_Y : 1;
  const titleTransform =
    scaleY === 1 ? undefined : `translate(${centerX} ${centerY}) scale(1 ${scaleY}) translate(${-centerX} ${-centerY})`;
  const titleStroke = USE_TITLE_STROKE ? "#000" : "none";
  const titleStrokeWidth = USE_TITLE_STROKE ? "1.5px" : undefined;
  const defaultTitleWeight = USE_BOLD_TITLE_WEIGHT ? 700 : 550;
  const titleFontWeight =
    !showRibbon && USE_LIGHTER_NONRIBBON_TITLE_WEIGHT ? NONRIBBON_TITLE_WEIGHT : defaultTitleWeight;

  return (
    <Layer>
      {showRibbon ? (
        <>
          <image
            href={ribbon.src}
            x={resolvedRibbonBounds.x}
            y={resolvedRibbonBounds.y}
            width={resolvedRibbonBounds.width}
            height={resolvedRibbonBounds.height}
            preserveAspectRatio="xMidYMid meet"
          />
          <g transform={titleTransform}>
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              opacity={0.9}
              fontSize={titleFontSize}
              fontWeight={titleFontWeight}
              letterSpacing={letterSpacing}
              stroke="#ffffff62"
              strokeWidth="5.5px"
              fontFamily={CARD_TEXT_FONT_FAMILY}
            >
              {titleLines[0]}
            </text>
          </g>
        </>
      ) : null}
      {/* white drop shadow */}
      <g transform={titleTransform}>
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          // fill="#1a130c"
          fill="#502300"
          fontSize={titleFontSize}
          // fontWeight={700}
          fontWeight={titleFontWeight}
          letterSpacing={letterSpacing}
          // stroke="#f00"
          // stroke="#311501ff"
          // letterSpacing="0.0em"
          // kerning={"1px"}
          stroke={titleStroke}
          strokeWidth={titleStrokeWidth}
          fontFamily={CARD_TEXT_FONT_FAMILY}
        >
          {titleLines[0]}
        </text>
      </g>
      {showDebugBounds && (
        <rect
          x={resolvedRibbonBounds.x}
          y={resolvedRibbonBounds.y}
          width={resolvedRibbonBounds.width}
          height={resolvedRibbonBounds.height}
          fill="transparent"
          stroke="#cd14e2ff"
          strokeWidth={2}
        />
      )}
      {showDebugBounds && (
        <rect
          x={resolvedTextBounds.x}
          y={resolvedTextBounds.y}
          width={resolvedTextBounds.width}
          height={resolvedTextBounds.height}
          fill="transparent"
          stroke="#14e2cdff"
          strokeWidth={2}
        />
      )}
    </Layer>
  );
}
