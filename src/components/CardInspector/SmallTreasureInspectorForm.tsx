"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import type { SmallTreasureCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import TitleField from "./TitleField";

export default function SmallTreasureInspectorForm() {
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<SmallTreasureCardData>({
    defaultValues: (cardDrafts["small-treasure"] as SmallTreasureCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft("small-treasure", value as SmallTreasureCardData);
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("small-treasure", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label="Card Title" required />
        <ImageField label="Card Image" boundsWidth={500} boundsHeight={180} />
        <ContentField label="Card Text" />
      </form>
    </FormProvider>
  );
}
