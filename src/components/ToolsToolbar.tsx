"use client";

import { Box, Move, Rotate3d, SlidersHorizontal, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { previewRendererFlags, usePreviewRenderer } from "@/components/PreviewRendererContext";
import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

function supportsWebgl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export default function ToolsToolbar() {
  const { t } = useI18n();
  const { previewRenderer, setPreviewRenderer } = usePreviewRenderer();
  const { SHOW_WEBGL_TOGGLE } = previewRendererFlags;
  const [isWebglSupported, setIsWebglSupported] = useState(false);
  const { interactionMode, setInteractionMode } = useWebglPreviewSettings();
  const showWebglControls = previewRenderer === "webgl";
  const { preferences, setRolePreferences, resetRolePreferences, setIsDragging } =
    useTextFittingPreferences();
  const [isTextPrefsOpen, setIsTextPrefsOpen] = useState(false);
  const [titleMinDraft, setTitleMinDraft] = useState(preferences.title.minFontPercent ?? 75);
  const [statMinDraft, setStatMinDraft] = useState(preferences.statHeading.minFontPercent ?? 95);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const supported = supportsWebgl();
    setIsWebglSupported(supported);
    if (!supported && previewRenderer === "webgl") {
      setPreviewRenderer("svg");
    }
  }, []);

  useEffect(() => {
    setTitleMinDraft(preferences.title.minFontPercent ?? 75);
  }, [preferences.title.minFontPercent]);

  useEffect(() => {
    setStatMinDraft(preferences.statHeading.minFontPercent ?? 95);
  }, [preferences.statHeading.minFontPercent]);

  useEffect(() => {
    if (!isTextPrefsOpen) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setIsTextPrefsOpen(false);
    };
    window.addEventListener("mousedown", handlePointer);
    return () => window.removeEventListener("mousedown", handlePointer);
  }, [isTextPrefsOpen]);

  if (!SHOW_WEBGL_TOGGLE || !isWebglSupported) {
    return null;
  }

  return (
    <div className={styles.toolsToolbar} aria-label={t("label.previewRenderer")}>
      <div className={`btn-group-vertical ${styles.toolsToolbarGroup}`} role="group">
        <button
          ref={buttonRef}
          type="button"
          className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
            isTextPrefsOpen ? "active" : ""
          }`}
          aria-pressed={isTextPrefsOpen}
          aria-label={t("label.textFittingSettings")}
          title={t("label.textFittingSettings")}
          onClick={() => setIsTextPrefsOpen((prev) => !prev)}
        >
          <SlidersHorizontal aria-hidden="true" />
        </button>
      </div>
      <div className={`btn-group-vertical ${styles.toolsToolbarGroup}`} role="group">
        <button
          type="button"
          className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
            previewRenderer === "svg" ? "active" : ""
          }`}
          aria-pressed={previewRenderer === "svg"}
          aria-label={t("label.previewRendererSvg")}
          title={t("label.previewRendererSvg")}
          onClick={() => setPreviewRenderer("svg")}
        >
          <Square aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
            previewRenderer === "webgl" ? "active" : ""
          }`}
          aria-pressed={previewRenderer === "webgl"}
          aria-label={t("label.previewRendererWebgl")}
          title={t("label.previewRendererWebgl")}
          onClick={() => setPreviewRenderer("webgl")}
        >
          <Box aria-hidden="true" />
        </button>
      </div>
      {showWebglControls ? (
        <div className={`btn-group-vertical ${styles.toolsToolbarGroup}`} role="group">
          <button
            type="button"
            className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
              interactionMode === "pan" ? "active" : ""
            }`}
            aria-pressed={interactionMode === "pan"}
            aria-label={t("label.webglPan")}
            title={t("label.webglPan")}
            onClick={() => setInteractionMode("pan")}
          >
            <Move aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`btn btn-sm btn-outline-light ${styles.toolsToolbarButton} ${
              interactionMode === "orbit" ? "active" : ""
            }`}
            aria-pressed={interactionMode === "orbit"}
            aria-label={t("label.webglRotate")}
            title={t("label.webglRotate")}
            onClick={() => setInteractionMode("orbit")}
          >
            <Rotate3d aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {isTextPrefsOpen ? (
        <div
          ref={popoverRef}
          className={styles.toolsToolbarPopover}
          role="dialog"
          aria-label={t("label.textFittingSettings")}
        >
          <div className={styles.toolsToolbarPopoverHeader}>{t("label.textFittingGlobal")}</div>
          <div className={styles.toolsToolbarPopoverBody}>
            <div className={styles.toolsToolbarPopoverSection}>
              <div className={styles.toolsToolbarPopoverSectionTitle}>{t("label.textFittingTitle")}</div>
              <label className={styles.toolsToolbarPopoverToggle}>
                <input
                  type="checkbox"
                  checked={Boolean(preferences.title.preferEllipsis)}
                  onChange={(event) =>
                    setRolePreferences("title", { preferEllipsis: event.target.checked })
                  }
                />
                {t("label.textFittingPreferEllipsis")}
              </label>
              <label className={styles.toolsToolbarPopoverLabel}>
                {t("label.textFittingMinFontSize")}: {Math.round(titleMinDraft)}%
                <input
                  type="range"
                  min={65}
                  max={100}
                  step={1}
                  value={titleMinDraft}
                  onChange={(event) => setTitleMinDraft(Number(event.target.value))}
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={() => {
                    setIsDragging(false);
                    setRolePreferences("title", { minFontPercent: Number(titleMinDraft) });
                  }}
                  onPointerCancel={() => {
                    setIsDragging(false);
                    setRolePreferences("title", { minFontPercent: Number(titleMinDraft) });
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => resetRolePreferences("title")}
              >
                {t("actions.resetTitleDefaults")}
              </button>
            </div>
            <div className={styles.toolsToolbarPopoverSection}>
              <div className={styles.toolsToolbarPopoverSectionTitle}>
                {t("label.textFittingStatHeadings")}
              </div>
              <label className={styles.toolsToolbarPopoverToggle}>
                <input
                  type="checkbox"
                  checked={Boolean(preferences.statHeading.preferEllipsis)}
                  onChange={(event) =>
                    setRolePreferences("statHeading", { preferEllipsis: event.target.checked })
                  }
                />
                {t("label.textFittingPreferEllipsis")}
              </label>
              <label className={styles.toolsToolbarPopoverLabel}>
                {t("label.textFittingMinFontSize")}: {Math.round(statMinDraft)}%
                <input
                  type="range"
                  min={65}
                  max={100}
                  step={1}
                  value={statMinDraft}
                  onChange={(event) => setStatMinDraft(Number(event.target.value))}
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={() => {
                    setIsDragging(false);
                    setRolePreferences("statHeading", { minFontPercent: Number(statMinDraft) });
                  }}
                  onPointerCancel={() => {
                    setIsDragging(false);
                    setRolePreferences("statHeading", { minFontPercent: Number(statMinDraft) });
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={() => resetRolePreferences("statHeading")}
              >
                {t("actions.resetStatDefaults")}
              </button>
            </div>
            <div className={styles.toolsToolbarPopoverHint}>{t("label.textFittingGlobalHint")}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
