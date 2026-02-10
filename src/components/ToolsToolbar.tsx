"use client";

import { Box, Move, RotateCw, Square } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { previewRendererFlags, usePreviewRenderer } from "@/components/PreviewRendererContext";
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

  useEffect(() => {
    const supported = supportsWebgl();
    setIsWebglSupported(supported);
    if (!supported && previewRenderer === "webgl") {
      setPreviewRenderer("svg");
    }
  }, []);

  if (!SHOW_WEBGL_TOGGLE || !isWebglSupported) {
    return null;
  }

  return (
    <div className={styles.toolsToolbar} aria-label={t("label.previewRenderer")}>
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
            <RotateCw aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
