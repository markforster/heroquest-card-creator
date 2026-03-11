"use client";

import { useFormContext, useWatch } from "react-hook-form";

import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveEffectiveFace } from "@/lib/card-face";
import { getImageLayerBounds } from "@/lib/image-scale";
import type { CardFace } from "@/types/card-face";
import type { TemplateId } from "@/types/templates";

import BackgroundTintField from "./BackgroundTintField";
import BorderColorField from "./BorderColorField";
import ContentField from "./ContentField";
import CopyrightField from "./CopyrightField";
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
  const { control } = useFormContext();
  const face = useWatch({ control, name: "face" }) as CardFace | undefined;
  const fields = inspectorFieldsByTemplate[templateId];
  const template = cardTemplatesById[templateId];
  const effectiveFace = template ? resolveEffectiveFace(face, template.defaultFace) : undefined;

  if (!fields || fields.length === 0) {
    return <div>{t("ui.inspectorGenericWip")}</div>;
  }

  return (
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
              showFormattingHelp={field.bind === "description"}
              showTextColor={field.props?.showTextColor}
              showBackdropColor={field.props?.showBackdropColor}
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
        if (field.fieldType === "backgroundTint") {
          return (
            <BackgroundTintField
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
  );
}
