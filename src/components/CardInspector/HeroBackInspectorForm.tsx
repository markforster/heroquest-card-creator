"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import type { HeroBackCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import TitleField from "./TitleField";

export default function HeroBackInspectorForm() {
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<HeroBackCardData>({
    defaultValues: (cardDrafts["hero-back"] as HeroBackCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft("hero-back", value as HeroBackCardData);
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
        <TitleField label="Back Title" required={false} />
        <ContentField label="Back Text" />
      </form>
    </FormProvider>
  );
}
