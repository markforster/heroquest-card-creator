"use client";

import { useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import GenericInspectorForm from "./GenericInspectorForm";
import DecksInspectorPanel from "./DecksInspectorPanel";
import PairingInspectorPanel from "./PairingInspectorPanel";

type InspectorMode = "form" | "pairing" | "decks";

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
  const [mode, setMode] = useState<InspectorMode>("form");

  // TODO: Implement a more scalable way to map templates to inspector forms.
  const key = selectedTemplateId
    ? activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`
    : "no-template";

  if (!selectedTemplateId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.selectTemplate")}</div>;
  }

  return (
    <div className={styles.inspectorMode}>
      <div className={styles.inspectorModeHeader}>
        <div
          className={styles.inspectorModeSegment}
          role="tablist"
          aria-label={t("tooltip.inspectorMode")}
        >
          <button
            type="button"
            className={`${styles.inspectorModeTab} ${
              mode === "form" ? styles.inspectorModeTabActive : ""
            }`}
            aria-pressed={mode === "form"}
            onClick={() => setMode("form")}
          >
            {t("label.formView")}
          </button>
          <button
            type="button"
            className={`${styles.inspectorModeTab} ${
              mode === "pairing" ? styles.inspectorModeTabActive : ""
            }`}
            aria-pressed={mode === "pairing"}
            onClick={() => setMode("pairing")}
          >
            {t("label.pairingView")}
          </button>
          <button
            type="button"
            className={`${styles.inspectorModeTab} ${
              mode === "decks" ? styles.inspectorModeTabActive : ""
            }`}
            aria-pressed={mode === "decks"}
            onClick={() => setMode("decks")}
          >
            {t("label.decksView")}
          </button>
        </div>
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
        ) : (
          <DecksInspectorPanel />
        )}
      </div>
    </div>
  );
}
