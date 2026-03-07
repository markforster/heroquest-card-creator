"use client";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useCollectionsTreeSettings } from "@/components/Providers/CollectionsTreeSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function CollectionsSettingsPanel() {
  const { t } = useI18n();
  const { enabled, setEnabled } = useCollectionsTreeSettings();

  return (
    <div className={styles.settingsPanelBody}>
      <SettingsGroup title={t("heading.collectionsSettings")} className="d-flex flex-column gap-2">
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
          {t("label.collectionsTreeExampleSingle")} <code>spells</code>
        </div>
        <div className={styles.settingsPanelRow}>
          {t("label.collectionsTreeExampleGrouped")} <code>spells/fire</code>{" "}
          {t("label.collectionsTreeExampleAnd")} <code>spells/air</code>
        </div>
      </SettingsGroup>
    </div>
  );
}
