"use client";

import styles from "@/app/page.module.css";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useI18n } from "@/i18n/I18nProvider";
import type { ExportImageFormat } from "@/lib/export-settings";

type ExportImageFormatGroupProps = {
  value: ExportImageFormat;
  onChange: (value: ExportImageFormat) => void;
};

export default function ExportImageFormatGroup({ value, onChange }: ExportImageFormatGroupProps) {
  const { t } = useI18n();

  return (
    <SettingsGroup title={t("heading.exportImageFormat")}>
      <fieldset className="border-0 m-0 p-0">
        <legend className="visually-hidden">{t("heading.exportImageFormat")}</legend>
        <div className="d-flex flex-column gap-2">
          {(["jpeg", "png"] as const).map((format) => (
            <label className="form-check form-check-inline mb-0" key={format}>
              <input
                type="radio"
                name="export-image-format"
                value={format}
                checked={value === format}
                className="form-check-input"
                onChange={() => onChange(format)}
              />
              <span className="form-check-label">
                {format === "jpeg"
                  ? t("label.exportImageFormatJpeg")
                  : t("label.exportImageFormatPng")}
              </span>
            </label>
          ))}
        </div>
        <p className={`${styles.settingsGroupMeta} mb-0 mt-2`}>{t("help.exportImageFormat")}</p>
      </fieldset>
    </SettingsGroup>
  );
}
