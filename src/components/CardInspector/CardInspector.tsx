"use client";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import { useInspectorMode } from "@/components/InspectorModeContext";
import { useI18n } from "@/i18n/I18nProvider";

import GenericInspectorForm from "./GenericInspectorForm";
import HeroBackInspectorForm from "./HeroBackInspectorForm";
import HeroInspectorForm from "./HeroInspectorForm";
import LabelledBackInspectorForm from "./LabelledBackInspectorForm";
import LargeTreasureInspectorForm from "./LargeTreasureInspectorForm";
import MonsterInspectorForm from "./MonsterInspectorForm";
import SmallTreasureInspectorForm from "./SmallTreasureInspectorForm";

export default function CardInspector() {
  const { t } = useI18n();
  const { inspectorMode } = useInspectorMode();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();

  // TODO: Implement a more scalable way to map templates to inspector forms.
  if (!selectedTemplateId) {
    return <div>{t("empty.selectTemplate")}</div>;
  }

  if (inspectorMode === "generic") {
    const key = activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`;
    return <GenericInspectorForm key={key} templateId={selectedTemplateId} />;
  }

  if (selectedTemplateId === "hero") {
    const key = activeCardIdByTemplate.hero ?? "hero-draft";
    return <HeroInspectorForm key={key} />;
  }

  if (selectedTemplateId === "monster") {
    const key = activeCardIdByTemplate.monster ?? "monster-draft";
    return <MonsterInspectorForm key={key} />;
  }

  if (selectedTemplateId === "small-treasure") {
    const key = activeCardIdByTemplate["small-treasure"] ?? "small-treasure-draft";
    return <SmallTreasureInspectorForm key={key} />;
  }

  if (selectedTemplateId === "large-treasure") {
    const key = activeCardIdByTemplate["large-treasure"] ?? "large-treasure-draft";
    return <LargeTreasureInspectorForm key={key} />;
  }

  if (selectedTemplateId === "hero-back") {
    const key = activeCardIdByTemplate["hero-back"] ?? "hero-back-draft";
    return <HeroBackInspectorForm key={key} />;
  }

  if (selectedTemplateId === "labelled-back") {
    const key = activeCardIdByTemplate["labelled-back"] ?? "labelled-back-draft";
    return <LabelledBackInspectorForm key={key} />;
  }

  return <div>{t("empty.inspectorUnavailable")}</div>;
}
