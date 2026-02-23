"use client";

import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { cardTemplatesById } from "@/data/card-templates";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { getImageLayerBounds } from "@/lib/image-scale";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardDataByTemplate } from "@/types/card-data";
import type { CardFace } from "@/types/card-face";
import type { TemplateId } from "@/types/templates";

import BorderColorField from "./BorderColorField";
import ContentField from "./ContentField";
import CopyrightField from "./CopyrightField";
import HeroStatsInspector from "./HeroStatsInspector";
import ImageField from "./ImageField";
import MonsterIconField from "./MonsterIconField";
import MonsterStatsInspector from "./MonsterStatsInspector";
import TitleField from "./TitleField";
import styles from "@/app/page.module.css";

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
  const effectiveFace = (() => {
    const template = cardTemplatesById[templateId];
    if (!template) return undefined;
    return (draftValue?.face ?? template.defaultFace) as CardFace;
  })();
  const showTitleToggle = Boolean(
    fields?.some((field) => field.fieldType === "title" && field.showToggle),
  );
  const showTitlePlacement = Boolean(
    fields?.some((field) => field.fieldType === "title" && field.showPlacement),
  );
  const showTitleStyle = Boolean(
    fields?.some((field) => field.fieldType === "title" && field.showStyleToggle),
  );
  const methods = useForm<CardDataByTemplate[TemplateId]>({
    defaultValues: {
      ...(draftValue ?? {}),
      ...(showTitleToggle ? { showTitle: draftValue?.showTitle ?? true } : {}),
      ...(showTitlePlacement
        ? {
            titlePlacement:
              (draftValue as { titlePlacement?: "top" | "bottom" })?.titlePlacement ?? "bottom",
          }
        : {}),
      ...(showTitleStyle
        ? {
            titleStyle:
              (draftValue as { titleStyle?: "ribbon" | "plain" })?.titleStyle ?? "ribbon",
          }
        : {}),
    },
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
      <form className={styles.uStackLg}>
        {fields.map((field, index) => {
          if (field.fieldType === "title") {
            return (
              <TitleField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                required={field.required}
                showToggle={field.showToggle}
                showPlacement={field.showPlacement}
                showStyleToggle={field.showStyleToggle}
                showToolbar={field.showToolbar}
                showTitleColor={field.showTitleColor}
              />
            );
          }
          if (field.fieldType === "text") {
            return (
              <ContentField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                showToolbar={field.props?.showToolbar}
                showToggle={field.showToggle}
              />
            );
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
            const bounds = getImageLayerBounds(templateId, field.bind) ?? {
              width: field.props.boundsWidth,
              height: field.props.boundsHeight,
              x: 0,
              y: 0,
            };
            return (
              <ImageField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                boundsWidth={bounds.width}
                boundsHeight={bounds.height}
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
          if (field.fieldType === "copyright") {
            if (effectiveFace !== "front") return null;
            return (
              <CopyrightField
                key={`${field.bind}-${index}`}
                label={t(field.labelKey)}
                placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
                showToggle={field.showToggle}
              />
            );
          }
          return null;
        })}
      </form>
    </FormProvider>
  );
}
