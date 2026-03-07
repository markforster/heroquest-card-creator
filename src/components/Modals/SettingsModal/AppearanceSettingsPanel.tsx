"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useTheme } from "@/components/Providers/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";

export default function AppearanceSettingsPanel() {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  const [lastExplicit, setLastExplicit] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (preference === "dark" || preference === "light") {
      setLastExplicit(preference);
    }
  }, [preference]);

  const isSystem = preference === "system";
  const activeTheme = isSystem ? lastExplicit : preference;

  const handleSystemToggle = (next: boolean) => {
    if (next) {
      setPreference("system");
      return;
    }
    setPreference(lastExplicit ?? "dark");
  };

  return (
    <div className={styles.settingsPanelBody}>
      <SettingsGroup title={t("heading.appearanceSettings")} className="d-flex flex-column gap-2">
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={isSystem}
            onChange={(event) => handleSystemToggle(event.target.checked)}
          />
          {t("label.useSystemTheme")}
        </label>
        <div className={styles.settingsPanelRow}>
          {t("label.useSystemThemeHint")}
        </div>
        <div className={`${styles.settingsPanelRow} d-flex flex-column gap-2`}>
          <div className={styles.settingsGroupTitle}>{t("label.theme")}</div>
          <label className={`${styles.settingsPanelOption} d-inline-flex align-items-center gap-2`}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={activeTheme === "dark"}
              disabled={isSystem}
              onChange={() => setPreference("dark")}
            />
            {t("label.themeDark")}
          </label>
          <label className={`${styles.settingsPanelOption} d-inline-flex align-items-center gap-2`}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={activeTheme === "light"}
              disabled={isSystem}
              onChange={() => setPreference("light")}
            />
            {t("label.themeLight")}
          </label>
        </div>
      </SettingsGroup>
    </div>
  );
}
