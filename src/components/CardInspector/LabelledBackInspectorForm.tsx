"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import type { LabelledBackCardData } from "@/types/card-data";

import ImageField from "./ImageField";
import TitleField from "./TitleField";

export default function LabelledBackInspectorForm() {
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<LabelledBackCardData>({
    defaultValues: (cardDrafts["labelled-back"] as LabelledBackCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft("labelled-back", value as LabelledBackCardData);
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("labelled-back", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label="Back Label" required />
        <ImageField label="Back Image" boundsWidth={750} boundsHeight={1050} />
      </form>
    </FormProvider>
  );
}
