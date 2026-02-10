"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { HeroBackCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import TitleField from "./TitleField";

export default function HeroBackInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const draftRef = useRef<HeroBackCardData | undefined>(
    cardDrafts["hero-back"] as HeroBackCardData | undefined,
  );
  useEffect(() => {
    draftRef.current = cardDrafts["hero-back"] as HeroBackCardData | undefined;
  }, [cardDrafts["hero-back"]]);

  const methods = useForm<HeroBackCardData>({
    defaultValues: (cardDrafts["hero-back"] as HeroBackCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      const currentDraft = draftRef.current ?? {};
      setCardDraft("hero-back", { ...currentDraft, ...(value as HeroBackCardData) });
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("hero-back", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label={t("form.backTitle")} required={false} />
        <ContentField label={t("form.backText")} />
      </form>
    </FormProvider>
  );
}
