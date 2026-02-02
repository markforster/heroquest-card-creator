"use client";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { MonsterCardData } from "@/types/card-data";

import SplitStatStepper from "./SplitStatStepper";
import StatStepper from "./StatStepper";

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
  const StatControl = allowSplit ? SplitStatStepper<MonsterCardData> : StatStepper<MonsterCardData>;

  return (
    <div className={layoutStyles.statGroup}>
      <label>{t("form.stats")}</label>
      <div className={layoutStyles.statRows}>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="movementSquares"
            label={t("stats.movementSquares")}
            min={0}
            max={12}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="attackDice"
            label={t("stats.attackDice")}
            min={0}
            max={12}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="defendDice"
            label={t("stats.defendDice")}
            min={0}
            max={12}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="bodyPoints"
            label={t("stats.bodyPoints")}
            min={0}
            max={12}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatControl
            name="mindPoints"
            label={t("stats.mindPoints")}
            min={0}
            max={12}
            allowWildcard={allowWildcard}
            splitSecondaryDefault={splitSecondaryDefault}
          />
        </div>
      </div>
    </div>
  );
}
