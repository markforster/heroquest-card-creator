"use client";

import styles from "@/app/page.module.css";
import { useDebugVisuals } from "@/components/DebugVisualsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function DebugSettingsPanel() {
  const { t } = useI18n();
  const { showTextBounds, setShowTextBounds } = useDebugVisuals();

  return (
    <div className={styles.settingsPanelBody}>
      <div className={`${styles.settingsNotice} ${styles.settingsNoticeWarning}`} role="status">
        Debug is enabled while we work through version 0.5.x and will be turned off in a future
        release.
      </div>
      <div className={styles.settingsPanelSection}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.debugVisuals")}</div>
        <label className={styles.settingsPanelToggle}>
          <input
            type="checkbox"
            className="form-check-input hq-toggle"
            checked={showTextBounds}
            onChange={(event) => setShowTextBounds(event.target.checked)}
          />
          {t("label.debugTextBounds")}
        </label>
      </div>
    </div>
  );
}
