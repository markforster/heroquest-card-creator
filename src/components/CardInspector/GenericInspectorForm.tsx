"use client";

import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import ContentField from "./ContentField";
import HeroStatsInspector from "./HeroStatsInspector";
import ImageField from "./ImageField";
import MonsterStatsInspector from "./MonsterStatsInspector";
import MonsterIconField from "./MonsterIconField";
import TitleField from "./TitleField";

type GenericInspectorFormProps = {
  templateId: TemplateId;
};

export default function GenericInspectorForm({ templateId }: GenericInspectorFormProps) {
  const { t } = useI18n();
  const {
    state: { cardDrafts },
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();

  const methods = useForm<CardDataByTemplate[TemplateId]>({
    defaultValues: (cardDrafts[templateId] as CardDataByTemplate[TemplateId] | undefined) ?? {},
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      setCardDraft(templateId, value as CardDataByTemplate[TemplateId]);
      if (isInitial) {
        isInitial = false;
        return;
      }
      setTemplateDirty(templateId, true);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setTemplateDirty, templateId]);

  const fields = inspectorFieldsByTemplate[templateId];
  if (!fields || fields.length === 0) {
    return <div>{t("ui.inspectorGenericWip")}</div>;
  }

  return (
    <FormProvider {...methods}>
      <form>
        {fields.map((field, index) => {
          if (field.fieldType === "title") {
            return (
              <TitleField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                required={field.required}
              />
            );
          }
          if (field.fieldType === "text") {
            return (
              <ContentField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
              />
            );
          }
          if (field.fieldType === "stats") {
            if (field.statsType === "hero") {
              return <HeroStatsInspector key={`stats-${index}`} />;
            }
            if (field.statsType === "monster") {
              return <MonsterStatsInspector key={`stats-${index}`} />;
            }
            return null;
          }
          if (field.fieldType === "image") {
            return (
              <ImageField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                boundsWidth={field.props.boundsWidth}
                boundsHeight={field.props.boundsHeight}
              />
            );
          }
          if (field.fieldType === "monsterIcon") {
            return (
              <MonsterIconField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
              />
            );
          }
          return null;
        })}
      </form>
    </FormProvider>
  );
}
