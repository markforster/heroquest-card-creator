import monsterStatsBg from "@/assets/card-parts/monster-stats.png";
import Layer from "@/components/CardPreview/Layer";
import { useStatLabelOverrides } from "@/components/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { getStatLabel } from "@/lib/stat-labels";

import StatsPair from "./StatsPair";

export type MonsterStats = {
  movementSquares: number;
  attackDice: number;
  defendDice: number;
  bodyPoints: number;
  mindPoints: number;
};

type MonsterStatsBlockProps = {
  stats?: MonsterStats;
  y?: number;
};

const CARD_WIDTH = 750;
const STATS_X = 39;
const STATS_Y = 842;
const STATS_WIDTH = CARD_WIDTH - STATS_X * 2; // 672
const STATS_HEIGHT = 179;

const defaultStats: MonsterStats = {
  movementSquares: 0,
  attackDice: 0,
  defendDice: 0,
  bodyPoints: 0,
  mindPoints: 0,
};

export const MONSTER_STATS_HEIGHT = STATS_HEIGHT;

export default function MonsterStatsBlock({ stats = defaultStats, y }: MonsterStatsBlockProps) {
  const { t } = useI18n();
  const { overrides } = useStatLabelOverrides();

  return (
    <Layer>
      <g transform={`translate(${STATS_X}, ${y ?? STATS_Y})`}>
        {/* outer debug frame */}
        {/* <rect
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          fill="transparent"
          stroke="#44e214ff"
          strokeWidth={5}
        /> */}
        <image
          href={monsterStatsBg.src}
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          // preserveAspectRatio="xMidYMid meet"
          preserveAspectRatio="none"
        />
        <StatsPair
          header={getStatLabel("statsLabelMove", t("stats.movementSquares"), overrides)}
          value={stats.movementSquares}
          x={14}
          y={14}
          width={170}
          height={138}
          // headerHeight={headerHeight}
        />
        <StatsPair
          header={getStatLabel("statsLabelAttack", t("stats.attackDice"), overrides)}
          value={stats.attackDice}
          x={194}
          y={14}
          width={110}
          height={138}
        />
        <StatsPair
          header={getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides)}
          value={stats.defendDice}
          x={310}
          y={14}
          width={110}
          height={138}
        />
        <StatsPair
          header={getStatLabel("statsLabelMonsterBodyPoints", t("stats.bodyPoints"), overrides)}
          value={stats.bodyPoints}
          x={430}
          y={14}
          width={110}
          height={138}
        />
        <StatsPair
          header={getStatLabel("statsLabelMonsterMindPoints", t("stats.mindPoints"), overrides)}
          value={stats.mindPoints}
          x={545}
          y={14}
          width={110}
          height={138}
        />
      </g>
    </Layer>
  );
}
