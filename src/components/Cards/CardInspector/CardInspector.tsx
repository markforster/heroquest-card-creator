"use client";

import { useLayoutEffect, useRef, useState } from "react";

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
  const segmentRef = useRef<HTMLDivElement | null>(null);
  const formTabRef = useRef<HTMLButtonElement | null>(null);
  const pairingTabRef = useRef<HTMLButtonElement | null>(null);
  const [trackStyle, setTrackStyle] = useState<React.CSSProperties>({});

  // TODO: Implement a more scalable way to map templates to inspector forms.
  if (!selectedTemplateId) {
    return <div className={styles.inspectorModeEmpty}>{t("empty.selectTemplate")}</div>;
  }

  const key = activeCardIdByTemplate[selectedTemplateId] ?? `${selectedTemplateId}-draft`;

  useLayoutEffect(() => {
    const updateTrack = () => {
      const container = segmentRef.current;
      const activeButton = mode === "form" ? formTabRef.current : pairingTabRef.current;
      if (!container || !activeButton) return;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setTrackStyle({
        ["--segment-track-left" as never]: `${buttonRect.left - containerRect.left}px`,
        ["--segment-track-top" as never]: `${buttonRect.top - containerRect.top}px`,
        ["--segment-track-width" as never]: `${buttonRect.width}px`,
        ["--segment-track-height" as never]: `${buttonRect.height}px`,
      });
    };

    updateTrack();
    window.addEventListener("resize", updateTrack);
    return () => window.removeEventListener("resize", updateTrack);
  }, [mode]);

  return (
    <div className={styles.inspectorMode}>
      <div className={styles.inspectorModeHeader}>
        <div
          className={styles.inspectorModeSegment}
          role="tablist"
          aria-label={t("tooltip.inspectorMode")}
          ref={segmentRef}
          style={trackStyle}
        >
          <button
            type="button"
            className={`${styles.inspectorModeTab} ${
              mode === "form" ? styles.inspectorModeTabActive : ""
            }`}
            aria-pressed={mode === "form"}
            onClick={() => setMode("form")}
            ref={formTabRef}
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
            ref={pairingTabRef}
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
