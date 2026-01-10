import heroStatsBg from "@/assets/card-parts/hero-stats.png";
import StatsPair from "@/components/CardParts/StatsPair";
import Layer from "@/components/CardPreview/Layer";
import { useStatLabelOverrides } from "@/components/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { getStatLabel } from "@/lib/stat-labels";

export type HeroStats = {
  attackDice: number;
  defendDice: number;
  bodyPoints: number;
  mindPoints: number;
};

type HeroStatsBlockProps = {
  stats?: HeroStats;
  y?: number;
};

const CARD_WIDTH = 750;
const STATS_X = 39;
const STATS_Y = 846;
const STATS_WIDTH = CARD_WIDTH - STATS_X * 2; // 630
const STATS_HEIGHT = 170;

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

  return (
    <Layer>
      <g transform={`translate(${STATS_X}, ${y ?? STATS_Y})`}>
        {/* Outer debug frame for alignment */}
        {/* <rect
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          fill="transparent"
          stroke="#e21414ff"
          strokeWidth={1}
        /> */}
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
          x={14}
          y={12}
          width={160}
          height={134}
        />
        <StatsPair
          header={getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides)}
          value={stats.defendDice}
          x={174}
          y={12}
          width={160}
          height={134}
        />
        <StatsPair
          header={getStatLabel("statsLabelStartingPoints", t("statsLabelStartingPoints"), overrides)}
          x={174 + 160}
          width={320}
          y={12}
          height={101}
          headerHeight={35}
        />
        <StatsPair
          header={getStatLabel("statsLabelHeroBody", t("stats.body"), overrides)}
          value={stats.bodyPoints}
          x={174 + 160}
          width={160}
          y={44}
          height={101}
          headerHeight={35}
        />
        <StatsPair
          header={getStatLabel("statsLabelHeroMind", t("stats.mind"), overrides)}
          value={stats.mindPoints}
          x={174 + 160 + 160}
          // y={12}
          width={160}
          y={44}
          height={101}
          headerHeight={35}
        />
      </g>
    </Layer>
  );
}
