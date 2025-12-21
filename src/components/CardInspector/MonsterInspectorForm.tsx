"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import type { MonsterCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import MonsterIconField from "./MonsterIconField";
import StatStepper from "./StatStepper";
import TitleField from "./TitleField";

export default function MonsterInspectorForm() {
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<MonsterCardData>({
    defaultValues: (cardDrafts.monster as MonsterCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft("monster", value as MonsterCardData);
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
        <TitleField label="Monster Name" required />
        <ImageField label="Monster Image" boundsWidth={730} boundsHeight={730} />
        <MonsterIconField label="Monster Icon" />
        <div className={layoutStyles.statGroup}>
          <label>Stats</label>
          <div className={layoutStyles.statRows}>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="movementSquares"
                label="Movement"
                min={0}
                max={12}
              />
              <StatStepper<MonsterCardData>
                name="attackDice"
                label="Attack Dice"
                min={0}
                max={12}
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="defendDice"
                label="Defend Dice"
                min={0}
                max={12}
              />
              <StatStepper<MonsterCardData>
                name="bodyPoints"
                label="Body Points"
                min={0}
                max={12}
              />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<MonsterCardData>
                name="mindPoints"
                label="Mind Points"
                min={0}
                max={12}
              />
              <div className={layoutStyles.statSpacer} />
            </div>
          </div>
        </div>
        <ContentField label="Card Text" />
      </form>
    </FormProvider>
  );
}
