import ribbon from "@/assets/card-parts/ribbon.png";
import Layer from "@/components/CardPreview/Layer";
import { CARD_TEXT_FONT_FAMILY } from "@/lib/fonts";

type RibbonTitleProps = {
  title: string;
  y?: number;
  showRibbon?: boolean;
};

const CARD_WIDTH = 750;
const SCALE = 1.05;
const RIBBON_WIDTH = 560 * SCALE;
const RIBBON_HEIGHT = 143 * SCALE;
const DEFAULT_Y = 46;

const TEXT_Y_OFFSET = 30;
const TITLE_FONT_WEIGHT = 550;

export default function RibbonTitle({ title, y = DEFAULT_Y, showRibbon = true }: RibbonTitleProps) {
  const x = (CARD_WIDTH - RIBBON_WIDTH) / 2;
  const centerX = x + RIBBON_WIDTH / 2;
  const centerY = y + RIBBON_HEIGHT / 2 + 6;
  const TcenterX = centerX + 6;

  return (
    <Layer>
      {showRibbon ? (
        <>
          <image
            href={ribbon.src}
            x={x}
            y={y}
            width={RIBBON_WIDTH}
            height={RIBBON_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
          />
          <text
            x={TcenterX}
            y={centerY - TEXT_Y_OFFSET}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            opacity={0.9}
            fontSize="54"
            fontWeight={TITLE_FONT_WEIGHT}
            stroke="#ffffff62"
            strokeWidth="5.5px"
            fontFamily={CARD_TEXT_FONT_FAMILY}
          >
            {title}
          </text>
        </>
      ) : null}
      {/* white drop shadow */}

      <text
        x={TcenterX}
        y={centerY - TEXT_Y_OFFSET}
        textAnchor="middle"
        dominantBaseline="middle"
        // fill="#1a130c"
        fill="#502300"
        fontSize="54"
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
        {title}
      </text>
    </Layer>
  );
}
