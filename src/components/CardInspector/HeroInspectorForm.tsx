"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import type { HeroCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import StatStepper from "./StatStepper";
import TitleField from "./TitleField";

export default function HeroInspectorForm() {
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
        <TitleField label="Hero Name" required />
        <ImageField label="Hero Image" boundsWidth={730} boundsHeight={730} />
        <div className={layoutStyles.statGroup}>
          {/* <div className={layoutStyles.statGroupLabel}>Stats</div> */}
          <label>Stats</label>
          <div className={layoutStyles.statRows}>
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData> name="attackDice" label="Attack Dice" min={0} max={12} />
              <StatStepper<HeroCardData> name="defendDice" label="Defend Dice" min={0} max={12} />
            </div>
            <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData> name="bodyPoints" label="Body Points" min={0} max={12} />
              <StatStepper<HeroCardData> name="mindPoints" label="Mind Points" min={0} max={12} />
            </div>
            {/* <div className={layoutStyles.statRow}>
              <StatStepper<HeroCardData> name="movementSquares" label="Movement" min={0} max={12} />
              <div className={layoutStyles.statSpacer} />
            </div> */}
          </div>
        </div>
        <ContentField label="Card Text" />
      </form>
    </FormProvider>
  );
}
