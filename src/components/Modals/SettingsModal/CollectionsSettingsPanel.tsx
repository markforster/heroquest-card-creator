"use client";

import styles from "@/app/page.module.css";
import { useCollectionsTreeSettings } from "@/components/Providers/CollectionsTreeSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function CollectionsSettingsPanel() {
  const { t } = useI18n();
  const { enabled, setEnabled } = useCollectionsTreeSettings();

  return (
    <div className={styles.settingsPanelBody}>
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-2`}>
        <div className={styles.settingsPanelSectionTitle}>
          {t("heading.collectionsSettings")}
        </div>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {t("label.collectionsTreeToggle")}
        </label>
        <div className={styles.settingsPanelRow}>{t("label.collectionsTreeHelp")}</div>
        <div className={styles.settingsPanelRow}>
          {t("label.collectionsTreeExampleSingle")}{" "}
          <code>spells</code>
        </div>
        <div className={styles.settingsPanelRow}>
          {t("label.collectionsTreeExampleGrouped")}{" "}
          <code>spells/fire</code> {t("label.collectionsTreeExampleAnd")}{" "}
          <code>spells/air</code>
        </div>
      </div>
    </div>
  );
}
