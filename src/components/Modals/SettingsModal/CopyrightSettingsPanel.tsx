"use client";

import { useEffect, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useCopyrightSettings } from "@/components/Providers/CopyrightSettingsContext";
import { cardTemplates } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";

export default function CopyrightSettingsPanel() {
  const { t } = useI18n();
  const {
    defaultCopyright,
    getTemplateDefault,
    setDefaultCopyright,
    setTemplateDefault,
    isReady,
  } = useCopyrightSettings();
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
      <SettingsGroup title={t("form.defaultCopyright")} className="d-flex flex-column gap-2">
        <input
          id="defaultCopyright"
          type="text"
          className={`form-control form-control-sm ${styles.settingsPanelInput}`}
          aria-label={t("form.defaultCopyright")}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
        />
        <div className="form-text">{t("helper.defaultCopyright")}</div>
      </SettingsGroup>
      <SettingsGroup title={t("heading.copyrightVisibility")} className="d-flex flex-column gap-2">
        <div className="form-text">{t("helper.copyrightTemplateDefaults")}</div>
        <div className={styles.copyrightTemplateDefaultsGrid}>
          {cardTemplates.map((template) => (
            <div key={template.id} className={styles.copyrightTemplateDefaultCard}>
              <img
                src={template.thumbnail.src}
                alt=""
                width={53}
                height={74}
                className={styles.copyrightTemplateDefaultThumb}
              />
              <div className={styles.copyrightTemplateDefaultFooter}>
                <label className="form-check form-switch m-0">
                  <input
                    id={`copyright-default-${template.id}`}
                    type="checkbox"
                    className="form-check-input hq-toggle"
                    aria-label={template.id}
                    checked={getTemplateDefault(template.id)}
                    onChange={(event) => setTemplateDefault(template.id, event.target.checked)}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </SettingsGroup>
    </div>
  );
}
