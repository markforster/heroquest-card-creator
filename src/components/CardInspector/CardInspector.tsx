"use client";

import { useCardEditor } from "@/components/CardEditor/CardEditorContext";

import HeroBackInspectorForm from "./HeroBackInspectorForm";
import HeroInspectorForm from "./HeroInspectorForm";
import LabelledBackInspectorForm from "./LabelledBackInspectorForm";
import LargeTreasureInspectorForm from "./LargeTreasureInspectorForm";
import MonsterInspectorForm from "./MonsterInspectorForm";
import SmallTreasureInspectorForm from "./SmallTreasureInspectorForm";

export default function CardInspector() {
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();

  // TODO: Implement a more scalable way to map templates to inspector forms.
  if (!selectedTemplateId) {
    return <div>Select a template to start editing.</div>;
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

  return <div>Inspector for this template is not available yet.</div>;
}
