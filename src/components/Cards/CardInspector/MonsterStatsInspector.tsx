"use client";

import { Brain, Footprints, ShieldHalf, Swords, UserRound } from "lucide-react";

import { EDITOR_TARGET_IDS } from "@/components/Cards/CardEditor/EditorTargetsContext";
import type { MonsterCardData } from "@/types/card-data";

import BaseStatsInspector, { type BaseStatField } from "./BaseStatsInspector";

type MonsterStatsInspectorProps = {
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

const MONSTER_FIELDS = [
  { name: "movementSquares", labelKey: "stats.movementSquares", icon: Footprints },
  { name: "attackDice", labelKey: "stats.attackDice", icon: Swords },
  { name: "defendDice", labelKey: "stats.defendDice", icon: ShieldHalf },
  { name: "bodyPoints", labelKey: "stats.bodyPoints", icon: UserRound },
  { name: "mindPoints", labelKey: "stats.mindPoints", icon: Brain },
] satisfies BaseStatField<MonsterCardData>[];

export default function MonsterStatsInspector({
  allowSplit = false,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: MonsterStatsInspectorProps) {
  return (
    <BaseStatsInspector<MonsterCardData>
      fields={MONSTER_FIELDS}
      targetId={EDITOR_TARGET_IDS.statsMonster}
      allowSplit={allowSplit}
      allowWildcard={allowWildcard}
      splitSecondaryDefault={splitSecondaryDefault}
    />
  );
}
