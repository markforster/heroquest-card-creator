"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Brain, Footprints, ShieldHalf, Swords, UserRound } from "lucide-react";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { formatStatValue } from "@/lib/stat-values";
import type { MonsterCardData } from "@/types/card-data";

import SplitStatStepper from "./SplitStatStepper";
import StatStepper from "./StatStepper";
import StatsAccordion from "./StatsAccordion";

type MonsterStatsInspectorProps = {
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

export default function MonsterStatsInspector({
  allowSplit = false,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: MonsterStatsInspectorProps) {
  const { t } = useI18n();
  const { control } = useFormContext<MonsterCardData>();
  const StatControl = allowSplit ? SplitStatStepper<MonsterCardData> : StatStepper<MonsterCardData>;
  const movementSquares = useWatch({ control, name: "movementSquares" });
  const attackDice = useWatch({ control, name: "attackDice" });
  const defendDice = useWatch({ control, name: "defendDice" });
  const bodyPoints = useWatch({ control, name: "bodyPoints" });
  const mindPoints = useWatch({ control, name: "mindPoints" });
  const previewValues = [
    formatStatValue(movementSquares) ?? "0",
    formatStatValue(attackDice) ?? "0",
    formatStatValue(defendDice) ?? "0",
    formatStatValue(bodyPoints) ?? "0",
    formatStatValue(mindPoints) ?? "0",
  ];

  return (
    <StatsAccordion label={t("form.stats")} previewValues={previewValues}>
      <div className={layoutStyles.statRows}>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="movementSquares"
            label={t("stats.movementSquares")}
            icon={Footprints}
            min={0}
            max={999}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="attackDice"
            label={t("stats.attackDice")}
            icon={Swords}
            min={0}
            max={999}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="defendDice"
            label={t("stats.defendDice")}
            icon={ShieldHalf}
            min={0}
            max={999}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="bodyPoints"
            label={t("stats.bodyPoints")}
            icon={UserRound}
            min={0}
            max={999}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="mindPoints"
            label={t("stats.mindPoints")}
            icon={Brain}
            min={0}
            max={999}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
      </div>
    </StatsAccordion>
  );
}
