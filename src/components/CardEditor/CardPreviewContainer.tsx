"use client";

import CardPreview, { CardPreviewHandle } from "@/components/CardPreview";
import { cardTemplatesById } from "@/data/card-templates";
import type { TemplateId } from "@/types/templates";

import { useCardEditor } from "./CardEditorContext";

import type { RefObject } from "react";

type CardPreviewContainerProps = {
  previewRef: RefObject<CardPreviewHandle>;
};

export default function CardPreviewContainer({ previewRef }: CardPreviewContainerProps) {
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

  return (
    <CardPreview
      ref={previewRef}
      templateId={template.id}
      templateName={template.name}
      backgroundSrc={template.background}
      cardData={cardData}
    />
  );
}
