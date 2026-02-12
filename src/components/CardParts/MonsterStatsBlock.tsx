import monsterStatsBg from "@/assets/card-parts/monster-stats.png";
import Layer from "@/components/CardPreview/Layer";
import { useStatLabelOverrides } from "@/components/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useDebugVisuals } from "@/components/DebugVisualsContext";
import { getStatLabel } from "@/lib/stat-labels";
import type { StatValue } from "@/types/stats";

import StatsPair from "./StatsPair";

export type MonsterStats = {
  movementSquares: StatValue;
  attackDice: StatValue;
  defendDice: StatValue;
  bodyPoints: StatValue;
  mindPoints: StatValue;
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
  const { showTextBounds } = useDebugVisuals();

  return (
    <Layer>
      <g transform={`translate(${STATS_X}, ${y ?? STATS_Y})`}>
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
          x={11}
          y={14}
          width={176}
          height={138}
          // headerHeight={headerHeight}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelAttack", t("stats.attackDice"), overrides)}
          value={stats.attackDice}
          x={191}
          y={14}
          width={116}
          height={138}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides)}
          value={stats.defendDice}
          x={307}
          y={14}
          width={116}
          height={138}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelMonsterBodyPoints", t("stats.bodyPoints"), overrides)}
          value={stats.bodyPoints}
          x={427}
          y={14}
          width={116}
          height={138}
          debug={showTextBounds}
        />
        <StatsPair
          header={getStatLabel("statsLabelMonsterMindPoints", t("stats.mindPoints"), overrides)}
          value={stats.mindPoints}
          x={542}
          y={14}
          width={116}
          height={138}
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
            data-debug-bounds="true"
          />
        )}
      </g>
    </Layer>
  );
}
