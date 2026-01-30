"use client";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { MonsterCardData } from "@/types/card-data";

import StatStepper from "./StatStepper";

export default function MonsterStatsInspector() {
  const { t } = useI18n();

  return (
    <div className={layoutStyles.statGroup}>
      <label>{t("form.stats")}</label>
      <div className={layoutStyles.statRows}>
        <div className={layoutStyles.statRow}>
          <StatStepper<MonsterCardData>
            name="movementSquares"
            label={t("stats.movementSquares")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<MonsterCardData>
            name="attackDice"
            label={t("stats.attackDice")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<MonsterCardData>
            name="defendDice"
            label={t("stats.defendDice")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<MonsterCardData>
            name="bodyPoints"
            label={t("stats.bodyPoints")}
            min={0}
            max={12}
          />
        </div>
        <div className={layoutStyles.statRow}>
          <StatStepper<MonsterCardData>
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
