"use client";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { HeroCardData } from "@/types/card-data";

import StatStepper from "./StatStepper";

export default function HeroStatsInspector() {
  const { t } = useI18n();

  return (
    <div className={layoutStyles.statGroup}>
      <label>{t("form.stats")}</label>
      <div className={layoutStyles.statRows}>
        <div className={layoutStyles.statRow}>
          <StatStepper<HeroCardData>
            name="attackDice"
            label={t("stats.attackDice")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<HeroCardData>
            name="defendDice"
            label={t("stats.defendDice")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<HeroCardData>
            name="bodyPoints"
            label={t("stats.bodyPoints")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<HeroCardData>
            name="mindPoints"
            label={t("stats.mindPoints")}
            min={0}
            max={12}
          />
        </div>
      </div>
    </div>
  );
}
