"use client";

import CardPreview, { CardPreviewHandle } from "@/components/CardPreview";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import type { TemplateId } from "@/types/templates";

import { useCardEditor } from "./CardEditorContext";

import type { RefObject } from "react";

type CardPreviewContainerProps = {
  previewRef: RefObject<CardPreviewHandle>;
};

export default function CardPreviewContainer({ previewRef }: CardPreviewContainerProps) {
  const { language } = useI18n();
  const {
    state: { selectedTemplateId, cardDrafts },
  } = useCardEditor();

  if (!selectedTemplateId) {
    return null;
  }

  const template = cardTemplatesById[selectedTemplateId as TemplateId];
  if (!template) {
    return null;
  }

  const cardData = cardDrafts[selectedTemplateId as TemplateId];
  const templateName = getTemplateNameLabel(language, template);

  return (
    <CardPreview
      ref={previewRef}
      templateId={template.id}
      templateName={templateName}
      backgroundSrc={template.background}
      cardData={cardData}
    />
  );
}
