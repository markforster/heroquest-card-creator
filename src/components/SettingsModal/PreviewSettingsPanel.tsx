"use client";

import styles from "@/app/page.module.css";
import {
  previewRendererFlags,
  usePreviewRenderer,
} from "@/components/PreviewRendererContext";
import { useWebglPreviewSettings } from "@/components/WebglPreviewSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function PreviewSettingsPanel() {
  const { t } = useI18n();
  const { previewRenderer, setPreviewRenderer, rotationMode, setRotationMode } =
    usePreviewRenderer();
  const { sheenAngle, setSheenAngle, sheenIntensity, setSheenIntensity } =
    useWebglPreviewSettings();
  const { USE_WEBGL_PREVIEW } = previewRendererFlags;
  const rendererDisabled = USE_WEBGL_PREVIEW;

  return (
    <div className={styles.settingsPanelBody}>
      <div className={styles.settingsPanelSection}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.previewRenderer")}</div>
        <div className={styles.settingsPanelRow}>
          <label className={styles.settingsPanelOption}>
            <input
              type="radio"
              name="previewRenderer"
              value="svg"
              checked={previewRenderer === "svg"}
              onChange={() => setPreviewRenderer("svg")}
              disabled={rendererDisabled}
            />
            {t("label.previewRendererSvg")}
          </label>
          <label className={styles.settingsPanelOption}>
            <input
              type="radio"
              name="previewRenderer"
              value="webgl"
              checked={previewRenderer === "webgl"}
              onChange={() => setPreviewRenderer("webgl")}
              disabled={rendererDisabled}
            />
            {t("label.previewRendererWebgl")}
          </label>
        </div>
      </div>

      <div className={styles.settingsPanelSection}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.webglInteraction")}</div>
        <div className={styles.settingsPanelRow}>
          <label className={styles.settingsPanelOption}>
            <input
              type="radio"
              name="webglMode"
              value="pan"
              checked={rotationMode === "pan"}
              onChange={() => setRotationMode("pan")}
            />
            {t("label.webglPan")}
          </label>
          <label className={styles.settingsPanelOption}>
            <input
              type="radio"
              name="webglMode"
              value="spin"
              checked={rotationMode === "spin"}
              onChange={() => setRotationMode("spin")}
            />
            {t("label.webglRotate")}
          </label>
        </div>
      </div>

      <div className={styles.settingsPanelSection}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.webglSheen")}</div>
        <label className={styles.settingsPanelRange}>
          {t("label.webglSheenAngle")}: {sheenAngle.toFixed(2)}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sheenAngle}
            onChange={(event) => setSheenAngle(Number(event.target.value))}
          />
        </label>
        <label className={styles.settingsPanelRange}>
          {t("label.webglSheenIntensity")}: {sheenIntensity.toFixed(2)}
          <input
            type="range"
            min={0.2}
            max={2}
            step={0.05}
            value={sheenIntensity}
            onChange={(event) => setSheenIntensity(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
