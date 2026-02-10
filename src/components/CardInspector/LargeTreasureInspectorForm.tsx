"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { LargeTreasureCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import TitleField from "./TitleField";

export default function LargeTreasureInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const draftRef = useRef<LargeTreasureCardData | undefined>(
    cardDrafts["large-treasure"] as LargeTreasureCardData | undefined,
  );
  useEffect(() => {
    draftRef.current = cardDrafts["large-treasure"] as LargeTreasureCardData | undefined;
  }, [cardDrafts["large-treasure"]]);

  const methods = useForm<LargeTreasureCardData>({
    defaultValues: (cardDrafts["large-treasure"] as LargeTreasureCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      const currentDraft = draftRef.current ?? {};
      setCardDraft("large-treasure", {
        ...currentDraft,
        ...(value as LargeTreasureCardData),
      });
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty("large-treasure", true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty]);

  return (
    <FormProvider {...methods}>
      <form>
        <TitleField label={t("form.cardTitle")} required />
        <ImageField label={t("form.cardImage")} boundsWidth={500} boundsHeight={370} />
        <ContentField label={t("form.cardText")} />
      </form>
    </FormProvider>
  );
}
