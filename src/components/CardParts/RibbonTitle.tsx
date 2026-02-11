import ribbon from "@/assets/card-parts/ribbon.png";
import Layer from "@/components/CardPreview/Layer";
import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
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

const TITLE_FONT_WEIGHT = 550;

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
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            opacity={0.9}
            fontSize={titleFontSize}
            fontWeight={TITLE_FONT_WEIGHT}
            stroke="#ffffff62"
            strokeWidth="5.5px"
            fontFamily={CARD_TEXT_FONT_FAMILY}
          >
            {titleLines[0]}
          </text>
        </>
      ) : null}
      {/* white drop shadow */}

      <text
        x={centerX}
        y={centerY}
        textAnchor="middle"
        dominantBaseline="middle"
        // fill="#1a130c"
        fill="#502300"
        fontSize={titleFontSize}
        // fontWeight={700}
        fontWeight={TITLE_FONT_WEIGHT}
        // stroke="#f00"
        // stroke="#311501ff"
        // letterSpacing="0.0em"
        // kerning={"1px"}
        stroke="#000"
        strokeWidth="1.5px"
        fontFamily={CARD_TEXT_FONT_FAMILY}
      >
        {titleLines[0]}
      </text>
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
