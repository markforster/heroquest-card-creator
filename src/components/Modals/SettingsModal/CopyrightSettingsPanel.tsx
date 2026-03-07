"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function CopyrightSettingsPanel() {
  const { t } = useI18n();
  const { defaultCopyright, setDefaultCopyright, isReady } = useCopyrightSettings();
  const [draft, setDraft] = useState(defaultCopyright);
  const saveTimeoutRef = useRef<number | null>(null);
  const currentYear = new Date().getFullYear();
  const placeholder = `© ${currentYear} ${t("placeholders.defaultCopyrightHolder")}`;

  useEffect(() => {
    if (!isReady) return;
    setDraft(defaultCopyright);
  }, [defaultCopyright, isReady]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setDraft(value);
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      setDefaultCopyright(value);
      saveTimeoutRef.current = null;
    }, 250);
  };

  return (
    <div className={styles.settingsPanelBody}>
      <SettingsGroup title={t("heading.copyrightDefaults")} className="d-flex flex-column gap-2">
        <label className="form-label" htmlFor="defaultCopyright">
          {t("form.defaultCopyright")}
        </label>
        <input
          id="defaultCopyright"
          type="text"
          className={`form-control form-control-sm ${styles.settingsPanelInput}`}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
        />
        <div className="form-text">{t("helper.defaultCopyright")}</div>
      </SettingsGroup>
    </div>
  );
}
