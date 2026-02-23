"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function CopyrightSettingsPanel() {
  const { t } = useI18n();
  const { defaultCopyright, setDefaultCopyright, isReady } = useCopyrightSettings();
  const [draft, setDraft] = useState(defaultCopyright);
  const saveTimeoutRef = useRef<number | null>(null);

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
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-2`}>
        <div className={styles.settingsPanelSectionTitle}>{t("heading.copyrightDefaults")}</div>
        <label className="form-label" htmlFor="defaultCopyright">
          {t("form.defaultCopyright")}
        </label>
        <input
          id="defaultCopyright"
          type="text"
          className="form-control form-control-sm"
          placeholder={t("placeholders.defaultCopyright")}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
        />
        <div className="form-text">{t("helper.defaultCopyright")}</div>
      </div>
    </div>
  );
}
