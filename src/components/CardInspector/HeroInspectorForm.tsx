"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { HeroCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import StatStepper from "./StatStepper";
import TitleField from "./TitleField";

export default function HeroInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<HeroCardData>({
    defaultValues: (cardDrafts.hero as HeroCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft("hero", value as HeroCardData);
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("hero", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label={t("form.heroName")} required />
        <ImageField label={t("form.heroImage")} boundsWidth={730} boundsHeight={730} />
        <div className={layoutStyles.statGroup}>
          {/* <div className={layoutStyles.statGroupLabel}>Stats</div> */}
          <label>{t("form.stats")}</label>
          <div className={layoutStyles.statRows}>
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData>
                name="attackDice"
                label={t("stats.attackDice")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData>
                name="defendDice"
                label={t("stats.defendDice")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            {/* <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData> name="movementSquares" label="Movement" min={0} max={12} />
              <div className={layoutStyles.statSpacer} />
            </div> */}
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData>
                name="bodyPoints"
                label={t("stats.bodyPoints")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData>
                name="mindPoints"
                label={t("stats.mindPoints")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
          </div>
        </div>
        <ContentField label={t("form.cardText")} />
      </form>
    </FormProvider>
  );
}
