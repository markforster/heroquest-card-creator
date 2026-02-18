"use client";

import { useWatch, useFormContext } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { formatStatValue } from "@/lib/stat-values";
import type { HeroCardData } from "@/types/card-data";

import SplitStatStepper from "./SplitStatStepper";
import StatStepper from "./StatStepper";
import StatsAccordion from "./StatsAccordion";

type HeroStatsInspectorProps = {
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

export default function HeroStatsInspector({
  allowSplit = false,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: HeroStatsInspectorProps) {
  const { t } = useI18n();
  const { control } = useFormContext<HeroCardData>();
  const StatControl = allowSplit ? SplitStatStepper<HeroCardData> : StatStepper<HeroCardData>;
  const attackDice = useWatch({ control, name: "attackDice" });
  const defendDice = useWatch({ control, name: "defendDice" });
  const bodyPoints = useWatch({ control, name: "bodyPoints" });
  const mindPoints = useWatch({ control, name: "mindPoints" });
  const previewValues = [
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
            name="attackDice"
            label={t("stats.attackDice")}
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
