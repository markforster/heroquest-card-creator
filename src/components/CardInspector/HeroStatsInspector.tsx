"use client";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { HeroCardData } from "@/types/card-data";

import SplitStatStepper from "./SplitStatStepper";
import StatStepper from "./StatStepper";

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
  const StatControl = allowSplit ? SplitStatStepper<HeroCardData> : StatStepper<HeroCardData>;

  return (
    <div className={layoutStyles.statGroup}>
      <label>{t("form.stats")}</label>
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
    </div>
  );
}
