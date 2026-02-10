"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { SmallTreasureCardData } from "@/types/card-data";

import ContentField from "./ContentField";
import ImageField from "./ImageField";
import TitleField from "./TitleField";

export default function SmallTreasureInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const draftRef = useRef<SmallTreasureCardData | undefined>(
    cardDrafts["small-treasure"] as SmallTreasureCardData | undefined,
  );
  useEffect(() => {
    draftRef.current = cardDrafts["small-treasure"] as SmallTreasureCardData | undefined;
  }, [cardDrafts["small-treasure"]]);

  const methods = useForm<SmallTreasureCardData>({
    defaultValues: (cardDrafts["small-treasure"] as SmallTreasureCardData | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      const currentDraft = draftRef.current ?? {};
      setCardDraft("small-treasure", {
        ...currentDraft,
        ...(value as SmallTreasureCardData),
      });
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
        <TitleField label={t("form.cardTitle")} required />
        <ImageField label={t("form.cardImage")} boundsWidth={500} boundsHeight={180} />
        <ContentField label={t("form.cardText")} />
      </form>
    </FormProvider>
  );
}
