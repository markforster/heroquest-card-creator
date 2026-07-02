import heroStatsBg from "@/assets/card-parts/hero-stats.png";
import {
  EDITOR_TARGET_IDS,
  HERO_STAT_TARGET_IDS,
  type EditorTargetId,
  useRegisterHoverAdornments,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import { padBounds } from "@/components/Cards/CardEditor/EditorTargetHoverVisual";
import StatsPair from "@/components/Cards/CardParts/StatsPair";
import Layer from "@/components/Cards/CardPreview/Layer";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { useStatLabelOverrides } from "@/components/Providers/StatLabelOverridesProvider";
import { CARD_WIDTH, sx, sy } from "@/config/card-canvas";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeFileProtocolAssetUrl } from "@/lib/browser";
import { getStatLabel } from "@/lib/stat-labels";
import type { BlueprintBounds } from "@/types/blueprints";
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

const STATS_INSET = sx(12);
const STATS_X = sx(39) + STATS_INSET;
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
const CELL_RADIUS = 12;
const CELL_HOVER_OUTSET = sx(10);

type HeroStatCell = {
  key: keyof HeroStats;
  targetId: (typeof HERO_STAT_TARGET_IDS)[keyof typeof HERO_STAT_TARGET_IDS];
  header: string;
  value?: StatValue;
  bounds: BlueprintBounds;
  headerHeight?: number;
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

export default function HeroStatsBlock({ stats = defaultStats, y }: HeroStatsBlockProps) {
  const { t } = useI18n();
  const { overrides } = useStatLabelOverrides();
  const { showTextBounds } = useDebugVisuals();
  const panelFocusProps = useSvgFocusTarget(EDITOR_TARGET_IDS.statsHero);
  const panelY = y ?? STATS_Y;
  const statCells: HeroStatCell[] = [
    {
      key: "attackDice",
      targetId: HERO_STAT_TARGET_IDS.attackDice,
      header: getStatLabel("statsLabelAttack", t("stats.attackDice"), overrides),
      value: stats.attackDice,
      bounds: { x: sx(10), y: sy(12), width: sx(162), height: sy(134) },
    },
    {
      key: "defendDice",
      targetId: HERO_STAT_TARGET_IDS.defendDice,
      header: getStatLabel("statsLabelDefend", t("stats.defendDice"), overrides),
      value: stats.defendDice,
      bounds: { x: sx(164), y: sy(12), width: sx(164), height: sy(134) },
    },
    {
      key: "bodyPoints",
      targetId: HERO_STAT_TARGET_IDS.bodyPoints,
      header: getStatLabel("statsLabelHeroBody", t("stats.body"), overrides),
      value: stats.bodyPoints,
      bounds: { x: sx(318), y: sy(44), width: sx(166), height: sy(102) },
      headerHeight: sy(35),
    },
    {
      key: "mindPoints",
      targetId: HERO_STAT_TARGET_IDS.mindPoints,
      header: getStatLabel("statsLabelHeroMind", t("stats.mind"), overrides),
      value: stats.mindPoints,
      bounds: { x: sx(474), y: sy(44), width: sx(164), height: sy(102) },
      headerHeight: sy(35),
    },
  ];
  useRegisterHoverAdornments([
    {
      targetId: EDITOR_TARGET_IDS.statsHero,
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
          href={normalizeFileProtocolAssetUrl(heroStatsBg.src)}
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          // preserveAspectRatio="xMidYMid meet"
          preserveAspectRatio="none"
        />
        {statCells.slice(0, 2).map((cell) => (
          <StatsPair
            key={cell.key}
            header={cell.header}
            value={cell.value}
            x={cell.bounds.x}
            y={cell.bounds.y}
            width={cell.bounds.width}
            height={cell.bounds.height}
            headerHeight={cell.headerHeight}
            debug={showTextBounds}
          />
        ))}
        <StatsPair
          header={getStatLabel(
            "statsLabelStartingPoints",
            t("statsLabelStartingPoints"),
            overrides,
          )}
          x={sx(318)}
          width={sx(320)}
          y={sy(12)}
          height={sy(92)}
          headerHeight={sy(32)}
          debug={showTextBounds}
        />
        {statCells.slice(2).map((cell) => (
          <StatsPair
            key={cell.key}
            header={cell.header}
            value={cell.value}
            x={cell.bounds.x}
            y={cell.bounds.y}
            width={cell.bounds.width}
            height={cell.bounds.height}
            headerHeight={cell.headerHeight}
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
          />
        )}
        <rect
          x={0}
          y={0}
          width={STATS_WIDTH}
          height={STATS_HEIGHT}
          fill="transparent"
          pointerEvents="all"
          data-hqcc-hit-area={EDITOR_TARGET_IDS.statsHero}
          {...panelFocusProps}
        />
        {statCells.map((cell) => (
          <StatsHitArea key={cell.targetId} targetId={cell.targetId} bounds={cell.bounds} />
        ))}
      </g>
    </Layer>
  );
}
