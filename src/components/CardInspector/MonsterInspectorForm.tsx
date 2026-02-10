"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { MonsterCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import MonsterIconField from "./MonsterIconField";
import StatStepper from "./StatStepper";
import TitleField from "./TitleField";

export default function MonsterInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const draftRef = useRef<MonsterCardData | undefined>(
    cardDrafts.monster as MonsterCardData | undefined,
  );
  useEffect(() => {
    draftRef.current = cardDrafts.monster as MonsterCardData | undefined;
  }, [cardDrafts.monster]);

  const methods = useForm<MonsterCardData>({
    defaultValues: (cardDrafts.monster as MonsterCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      const currentDraft = draftRef.current ?? {};
      setCardDraft("monster", { ...currentDraft, ...(value as MonsterCardData) });
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("monster", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label={t("form.monsterName")} required />
        <ImageField label={t("form.monsterImage")} boundsWidth={730} boundsHeight={730} />
        <MonsterIconField label={t("form.monsterIcon")} />
        <div className={layoutStyles.statGroup}>
          <label>{t("form.stats")}</label>
          <div className={layoutStyles.statRows}>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="movementSquares"
                label={t("stats.movementSquares")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="attackDice"
                label={t("stats.attackDice")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="defendDice"
                label={t("stats.defendDice")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="bodyPoints"
                label={t("stats.bodyPoints")}
                min={0}
                max={999}
                allowWildcard
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
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
