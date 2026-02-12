"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const DEBUG_TEXT_BOUNDS_KEY = "hqcc.debugTextBounds";

export default function DebugSettingsPanel() {
  const { t } = useI18n();
  const [debugTextBounds, setDebugTextBounds] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDebugTextBounds(window.localStorage.getItem(DEBUG_TEXT_BOUNDS_KEY) === "1");
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const handleToggle = (checked: boolean) => {
    setDebugTextBounds(checked);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DEBUG_TEXT_BOUNDS_KEY, checked ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <div className={styles.settingsPanelBody}>
      <div className={styles.settingsPanelSection}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.debugVisuals")}</div>
        <label className={styles.settingsPanelToggle}>
          <input
            type="checkbox"
            className="form-check-input hq-toggle"
            checked={debugTextBounds}
            onChange={(event) => handleToggle(event.target.checked)}
          />
          {t("label.debugTextBounds")}
        </label>
      </div>
    </div>
  );
}
