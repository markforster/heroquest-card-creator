"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardDataByTemplate } from "@/types/card-data";
import type { TemplateId } from "@/types/templates";

import BorderColorField from "./BorderColorField";
import ContentField from "./ContentField";
import HeroStatsInspector from "./HeroStatsInspector";
import ImageField from "./ImageField";
import MonsterIconField from "./MonsterIconField";
import MonsterStatsInspector from "./MonsterStatsInspector";
import TitleField from "./TitleField";

type GenericInspectorFormProps = {
  templateId: TemplateId;
};

export default function GenericInspectorForm({ templateId }: GenericInspectorFormProps) {
  const { t } = useI18n();
  const {
    state: { draftTemplateId, draft },
    setCardDraft,
    setSingleDraft,
    setTemplateDirty,
  } = useCardEditor();

  const draftValue =
    draftTemplateId === templateId && draft
      ? (draft as CardDataByTemplate[TemplateId])
      : undefined;
  const draftRef = useRef<CardDataByTemplate[TemplateId] | undefined>(draftValue);
  useEffect(() => {
    draftRef.current = draftValue;
  }, [draftValue]);
  const fields = inspectorFieldsByTemplate[templateId];
  const showTitleToggle = Boolean(
    fields?.some((field) => field.fieldType === "title" && field.showToggle),
  );
  const methods = useForm<CardDataByTemplate[TemplateId]>({
    defaultValues: showTitleToggle
      ? { ...draftValue, showTitle: draftValue?.showTitle ?? true }
      : (draftValue ?? {}),
    mode: "onBlur",
  });

  useEffect(() => {
    let isInitial = true;
    const subscription = methods.watch((value) => {
      if (isInitial) {
        isInitial = false;
        if (!draftRef.current) {
          return;
        }
      } else {
        setTemplateDirty(templateId, true);
      }
      const currentDraft = (draftRef.current ?? {}) as CardDataByTemplate[TemplateId];
      const nextDraft = {
        ...currentDraft,
        ...(value as CardDataByTemplate[TemplateId]),
      } as CardDataByTemplate[TemplateId];
      setCardDraft(templateId, nextDraft);
      setSingleDraft(templateId, nextDraft);
    });
    return () => subscription.unsubscribe();
  }, [methods, setCardDraft, setSingleDraft, setTemplateDirty, templateId]);

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
                showToggle={field.showToggle}
              />
            );
          }
          if (field.fieldType === "text") {
            return <ContentField key={`${field.bind}-${index}`} label={t(field.labelKey)} />;
          }
          if (field.fieldType === "stats") {
            if (field.statsType === "hero") {
              return (
                <HeroStatsInspector
                  key={`stats-${index}`}
                  allowSplit={field.allowSplit}
                  allowWildcard={field.allowWildcard}
                  splitSecondaryDefault={field.splitSecondaryDefault}
                />
              );
            }
            if (field.statsType === "monster") {
              return (
                <MonsterStatsInspector
                  key={`stats-${index}`}
                  allowSplit={field.allowSplit}
                  allowWildcard={field.allowWildcard}
                  splitSecondaryDefault={field.splitSecondaryDefault}
                />
              );
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
          if (field.fieldType === "borderColor") {
            return (
              <BorderColorField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                templateId={templateId}
              />
            );
          }
          if (field.fieldType === "monsterIcon") {
            return <MonsterIconField key={`${field.bind}-${index}`} label={t(field.labelKey)} />;
          }
          return null;
        })}
      </form>
    </FormProvider>
  );
}
