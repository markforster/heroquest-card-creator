"use client";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import GenericInspectorForm from "./GenericInspectorForm";

export default function CardInspector() {
  const { t } = useI18n();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();

  // TODO: Implement a more scalable way to map templates to inspector forms.
  if (!selectedTemplateId) {
    return <div>{t("empty.selectTemplate")}</div>;
  }

  const key = activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`;
  return <GenericInspectorForm key={key} templateId={selectedTemplateId} />;
}
