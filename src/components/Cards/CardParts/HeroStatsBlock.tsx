import heroStatsBg from "@/assets/card-parts/hero-stats.png";
import StatsPair from "@/components/Cards/CardParts/StatsPair";
import Layer from "@/components/Cards/CardPreview/Layer";
import { useStatLabelOverrides } from "@/components/Providers/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { getStatLabel } from "@/lib/stat-labels";
import { CARD_WIDTH, sx, sy } from "@/config/card-canvas";
import type { StatValue } from "@/types/stats";

export type HeroStats = {
  attackDice: StatValue;
  defendDice: StatValue;
  bodyPoints: StatValue;
  mindPoints: StatValue;
};

type HeroStatsBlockProps = {
  stats?: HeroStats;
  y?: number;
};

const STATS_X = sx(39);
const STATS_Y = sy(846);
const STATS_WIDTH = CARD_WIDTH - STATS_X * 2; // 630
const STATS_HEIGHT = sy(170);

const defaultStats: HeroStats = {
  attackDice: 3,
  defendDice: 2,
  bodyPoints: 8,
  mindPoints: 2,
};

export const HERO_STATS_HEIGHT = STATS_HEIGHT;

export default function HeroStatsBlock({ stats = defaultStats, y }: HeroStatsBlockProps) {
  const { t } = useI18n();
  const { overrides } = useStatLabelOverrides();
  const { showTextBounds } = useDebugVisuals();

  return (
    <Layer>
      <g transform={`translate(${STATS_X}, ${y ?? STATS_Y})`}>
        <image
          href={heroStatsBg.src}
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          // preserveAspectRatio="xMidYMid meet"
          preserveAspectRatio="none"
        />
        <StatsPair
          header={getStatLabel("statsLabelAttack", t("stats.attackDice"), overrides)}
          value={stats.attackDice}
          x={sx(11)}
          y={sy(12)}
          width={sx(166)}
          height={sy(134)}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides)}
          value={stats.defendDice}
          x={sx(171)}
          y={sy(12)}
          width={sx(166)}
          height={sy(134)}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelStartingPoints", t("statsLabelStartingPoints"), overrides)}
          x={sx(174 + 160 - 3)}
          width={sx(326)}
          y={sy(12)}
          height={sy(101)}
          headerHeight={sy(35)}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelHeroBody", t("stats.body"), overrides)}
          value={stats.bodyPoints}
          x={sx(174 + 160 - 3)}
          width={sx(166)}
          y={sy(44)}
          height={sy(101)}
          headerHeight={sy(35)}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelHeroMind", t("stats.mind"), overrides)}
          value={stats.mindPoints}
          x={sx(174 + 160 + 160 - 3)}
          // y={12}
          width={sx(166)}
          y={sy(44)}
          height={sy(101)}
          headerHeight={sy(35)}
          debug={showTextBounds}
        />
        {showTextBounds && (
          <rect
            x={0}
            y={0}
            width={STATS_WIDTH}
            height={STATS_HEIGHT}
            fill="transparent"
            stroke="#cd14e2ff"
            strokeWidth={2}
          />
        )}
      </g>
    </Layer>
  );
}
