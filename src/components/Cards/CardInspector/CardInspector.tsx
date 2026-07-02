"use client";

import { Combine, Info, Layers, SquareStack } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

import styles from "@/app/page.module.css";
import { useEditorTargets } from "@/components/Cards/CardEditor/EditorTargetsContext";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import CollectionsInspectorPanel from "./CollectionsInspectorPanel";
import GenericInspectorForm from "./GenericInspectorForm";
import DecksInspectorPanel from "./DecksInspectorPanel";
import PairingInspectorPanel from "./PairingInspectorPanel";

type InspectorMode = "form" | "pairing" | "collections" | "decks";

type InspectorModeConfig = {
  id: InspectorMode;
  label: string;
  Icon: LucideIcon;
};

type CardInspectorProps = {
  activeFrontId?: string | null;
  autoOpenBackId?: string | null;
  frontViewToken?: number;
  onRememberBackId?: (backId: string) => void;
  pairingReferenceId?: string | null;
};

export default function CardInspector({
  activeFrontId,
  autoOpenBackId,
  frontViewToken,
  onRememberBackId,
  pairingReferenceId,
}: CardInspectorProps) {
  const { t } = useI18n();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const { requestedFocusTargetId } = useEditorTargets();
  const [mode, setMode] = useState<InspectorMode>("form");
  const modes: InspectorModeConfig[] = [
    { id: "form", label: t("label.formView"), Icon: Info },
    { id: "pairing", label: t("label.pairingView"), Icon: Combine },
    { id: "collections", label: t("label.collections"), Icon: SquareStack },
    { id: "decks", label: t("label.decksView"), Icon: Layers },
  ];
  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  // TODO: Implement a more scalable way to map templates to inspector forms.
  const key = selectedTemplateId
    ? activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`
    : "no-template";

  useEffect(() => {
    if (!requestedFocusTargetId) return;
    if (mode === "form") return;
    setMode("form");
  }, [mode, requestedFocusTargetId]);

  if (!selectedTemplateId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.selectTemplate")}</div>;
  }

  return (
    <div className={styles.inspectorMode}>
      <div className={styles.inspectorModeContent}>
        <div className={styles.deckFaceModeHeader}>
          <div className={styles.deckFaceModeTitle}>{activeMode.label}</div>
        </div>
        <div className={styles.inspectorModeBody}>
          {mode === "form" ? (
            <GenericInspectorForm key={key} templateId={selectedTemplateId} />
          ) : mode === "pairing" ? (
            <PairingInspectorPanel
              activeFrontId={activeFrontId}
              autoOpenBackId={autoOpenBackId}
              frontViewToken={frontViewToken}
              onRememberBackId={onRememberBackId}
              pairingReferenceId={pairingReferenceId}
            />
          ) : mode === "collections" ? (
            <CollectionsInspectorPanel />
          ) : (
            <DecksInspectorPanel />
          )}
        </div>
      </div>
      <div
        className={styles.inspectorModeTabRail}
        role="tablist"
        aria-label={t("tooltip.inspectorMode")}
        aria-orientation="vertical"
      >
        <div className={styles.inspectorModeTabRailGroup}>
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={styles.inspectorModeTabButton}
              aria-selected={mode === id}
              aria-label={label}
              title={label}
              onClick={() => setMode(id)}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Icon className={styles.deckBacksTabIcon} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
