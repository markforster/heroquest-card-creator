"use client";

import { Brain, ShieldHalf, Swords, UserRound } from "lucide-react";

import { EDITOR_TARGET_IDS } from "@/components/Cards/CardEditor/EditorTargetsContext";
import type { HeroCardData } from "@/types/card-data";

import BaseStatsInspector, { type BaseStatField } from "./BaseStatsInspector";

type HeroStatsInspectorProps = {
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

const HERO_FIELDS = [
  { name: "attackDice", labelKey: "stats.attackDice", icon: Swords },
  { name: "defendDice", labelKey: "stats.defendDice", icon: ShieldHalf },
  { name: "bodyPoints", labelKey: "stats.bodyPoints", icon: UserRound },
  { name: "mindPoints", labelKey: "stats.mindPoints", icon: Brain },
] satisfies BaseStatField<HeroCardData>[];

export default function HeroStatsInspector({
  allowSplit = false,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: HeroStatsInspectorProps) {
  return (
    <BaseStatsInspector<HeroCardData>
      fields={HERO_FIELDS}
      targetId={EDITOR_TARGET_IDS.statsHero}
      allowSplit={allowSplit}
      allowWildcard={allowWildcard}
      splitSecondaryDefault={splitSecondaryDefault}
    />
  );
}
