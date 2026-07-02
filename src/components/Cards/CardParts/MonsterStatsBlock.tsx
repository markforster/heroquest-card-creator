import monsterStatsBg from "@/assets/card-parts/monster-stats.png";
import {
  EDITOR_TARGET_IDS,
  MONSTER_STAT_TARGET_IDS,
  type EditorTargetId,
  useRegisterHoverAdornments,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { padBounds } from "@/components/Cards/CardEditor/EditorTargetHoverVisual";
import Layer from "@/components/Cards/CardPreview/Layer";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { useStatLabelOverrides } from "@/components/Providers/StatLabelOverridesProvider";
import { CARD_WIDTH, sx, sy } from "@/config/card-canvas";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeFileProtocolAssetUrl } from "@/lib/browser";
import { getStatLabel } from "@/lib/stat-labels";
import type { BlueprintBounds } from "@/types/blueprints";
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

const STATS_X = sx(39);
const STATS_Y = sy(842);
const STATS_WIDTH = CARD_WIDTH - STATS_X * 2; // 672
const STATS_HEIGHT = sy(179);

const defaultStats: MonsterStats = {
  movementSquares: 0,
  attackDice: 0,
  defendDice: 0,
  bodyPoints: 0,
  mindPoints: 0,
};

export const MONSTER_STATS_HEIGHT = STATS_HEIGHT;
const CELL_RADIUS = 12;
const CELL_HOVER_OUTSET = sx(10);

type MonsterStatCell = {
  key: keyof MonsterStats;
  targetId: (typeof MONSTER_STAT_TARGET_IDS)[keyof typeof MONSTER_STAT_TARGET_IDS];
  header: string;
  value?: StatValue;
  bounds: BlueprintBounds;
};

function StatsHitArea({ targetId, bounds }: { targetId: EditorTargetId; bounds: BlueprintBounds }) {
  const focusProps = useSvgFocusTarget(targetId);

  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill="transparent"
      pointerEvents="all"
      data-hqcc-hit-area={targetId}
      {...focusProps}
    />
  );
}

export default function MonsterStatsBlock({ stats = defaultStats, y }: MonsterStatsBlockProps) {
  const { t } = useI18n();
  const { overrides } = useStatLabelOverrides();
  const { showTextBounds } = useDebugVisuals();
  const panelFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.statsMonster);
  const panelY = y ?? STATS_Y;
  const statCells: MonsterStatCell[] = [
    {
      key: "movementSquares",
      targetId: MONSTER_STAT_TARGET_IDS.movementSquares,
      header: getStatLabel("statsLabelMove", t("stats.movementSquares"), overrides),
      value: stats.movementSquares,
      bounds: { x: sx(11), y: sy(14), width: sx(176), height: sy(138) },
    },
    {
      key: "attackDice",
      targetId: MONSTER_STAT_TARGET_IDS.attackDice,
      header: getStatLabel("statsLabelAttack", t("stats.attackDice"), overrides),
      value: stats.attackDice,
      bounds: { x: sx(191), y: sy(14), width: sx(116), height: sy(138) },
    },
    {
      key: "defendDice",
      targetId: MONSTER_STAT_TARGET_IDS.defendDice,
      header: getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides),
      value: stats.defendDice,
      bounds: { x: sx(307), y: sy(14), width: sx(116), height: sy(138) },
    },
    {
      key: "bodyPoints",
      targetId: MONSTER_STAT_TARGET_IDS.bodyPoints,
      header: getStatLabel("statsLabelMonsterBodyPoints", t("stats.bodyPoints"), overrides),
      value: stats.bodyPoints,
      bounds: { x: sx(427), y: sy(14), width: sx(116), height: sy(138) },
    },
    {
      key: "mindPoints",
      targetId: MONSTER_STAT_TARGET_IDS.mindPoints,
      header: getStatLabel("statsLabelMonsterMindPoints", t("stats.mindPoints"), overrides),
      value: stats.mindPoints,
      bounds: { x: sx(542), y: sy(14), width: sx(116), height: sy(138) },
    },
  ];
  useRegisterHoverAdornments([
    {
      targetId: EDITOR_TARGET_IDS.statsMonster,
      descriptor: null,
    },
    ...statCells.map((cell) => ({
      targetId: cell.targetId,
      descriptor: {
        kind: "group" as const,
        items: [
          {
            kind: "rect" as const,
            ...padBounds(
              {
                x: STATS_X + cell.bounds.x,
                y: panelY + cell.bounds.y,
                width: cell.bounds.width,
                height: cell.bounds.height,
              },
              CELL_HOVER_OUTSET,
            ),
            radius: CELL_RADIUS,
            tone: "active" as const,
          },
        ],
      },
    })),
  ]);

  return (
    <Layer>
      <g transform={`translate(${STATS_X}, ${panelY})`}>
        <image
          href={normalizeFileProtocolAssetUrl(monsterStatsBg.src)}
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          // preserveAspectRatio="xMidYMid meet"
          preserveAspectRatio="none"
        />
        {statCells.map((cell) => (
          <StatsPair
            key={cell.key}
            header={cell.header}
            value={cell.value}
            x={cell.bounds.x}
            y={cell.bounds.y}
            width={cell.bounds.width}
            height={cell.bounds.height}
            debug={showTextBounds}
          />
        ))}
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
        <rect
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          fill="transparent"
          pointerEvents="all"
          data-hqcc-hit-area={EDITOR_TARGET_IDS.statsMonster}
          {...panelFocusProps}
        />
        {statCells.map((cell) => (
          <StatsHitArea key={cell.targetId} targetId={cell.targetId} bounds={cell.bounds} />
        ))}
      </g>
    </Layer>
  );
}
