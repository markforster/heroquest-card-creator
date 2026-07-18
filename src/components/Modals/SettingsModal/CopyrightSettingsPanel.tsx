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
      <SettingsGroup className="d-flex flex-column gap-2">
        {cardTemplates.map((template) => (
          <div
            key={template.id}
            className="d-flex align-items-center justify-content-between gap-3"
          >
            <div className="d-flex align-items-center gap-2 min-w-0">
              <img
                src={template.thumbnail.src}
                alt=""
                width={36}
                height={50}
                style={{ objectFit: "cover", borderRadius: 4, border: "1px solid #00000022" }}
              />
              <label className="form-label mb-0" htmlFor={`copyright-default-${template.id}`}>
                {t(`templates.${template.id}` as MessageKey)}
              </label>
            </div>
            <label className="form-check form-switch m-0">
              <input
                id={`copyright-default-${template.id}`}
                type="checkbox"
                className="form-check-input hq-toggle"
                checked={getTemplateDefault(template.id)}
                onChange={(event) => setTemplateDefault(template.id, event.target.checked)}
              />
            </label>
          </div>
        ))}
      </SettingsGroup>
    </div>
  );
}
