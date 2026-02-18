"use client";

import { useState } from "react";

import styles from "@/app/page.module.css";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useI18n } from "@/i18n/I18nProvider";

import GenericInspectorForm from "./GenericInspectorForm";
import PairingInspectorPanel from "./PairingInspectorPanel";

type InspectorMode = "form" | "pairing";

export default function CardInspector() {
  const { t } = useI18n();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const [mode, setMode] = useState<InspectorMode>("form");

  // TODO: Implement a more scalable way to map templates to inspector forms.
  if (!selectedTemplateId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.selectTemplate")}</div>;
  }

  const key = activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`;

  return (
    <div className={styles.inspectorMode}>
      <div className={styles.inspectorModeHeader}>
        <div className={styles.inspectorModeSegment} role="tablist" aria-label={t("tooltip.inspectorMode")}>
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
        </div>
      </div>
      <div className={styles.inspectorModeBody}>
        {mode === "form" ? (
          <GenericInspectorForm key={key} templateId={selectedTemplateId} />
        ) : (
          <PairingInspectorPanel />
        )}
      </div>
    </div>
  );
}
