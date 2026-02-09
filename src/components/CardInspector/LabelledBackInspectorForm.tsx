"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { LabelledBackCardData } from "@/types/card-data";

import BorderColorField from "./BorderColorField";
import ImageField from "./ImageField";
import TitleField from "./TitleField";

export default function LabelledBackInspectorForm() {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<LabelledBackCardData>({
    defaultValues: {
      ...(cardDrafts["labelled-back"] as LabelledBackCardData | undefined),
      showTitle:
        (cardDrafts["labelled-back"] as LabelledBackCardData | undefined)?.showTitle ?? true,
    },
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
        <TitleField label={t("form.backLabel")} required showToggle />
        <ImageField label={t("form.backImage")} boundsWidth={750} boundsHeight={1050} />
        <BorderColorField label={t("form.borderColor")} templateId="labelled-back" />
      </form>
    </FormProvider>
  );
}
