"use client";

import styles from "@/app/page.module.css";
import PdfDuplexPresetField from "@/components/Export/PdfDuplexPresetField";
import { useI18n } from "@/i18n/I18nProvider";
import type { PrintConfig } from "@/lib/pdf-export";

type PdfExportConfigFormProps = {
  config: PrintConfig;
  onChange: (next: PrintConfig) => void;
};

export default function PdfExportConfigForm({ config, onChange }: PdfExportConfigFormProps) {
  const { t } = useI18n();
  const showCardSizeFields = false;

  return (
    <div className={`${styles.settingsGroup} ${styles.pdfExportForm}`}>
      <div className={styles.pdfExportRow}>
        <div className={styles.pdfExportField}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-paper">
            {t("decks.pdf.paper")}
          </label>
          <select
            id="pdf-paper"
            className="form-select form-select-sm"
            value={config.paper}
            onChange={(event) =>
              onChange({ ...config, paper: event.target.value as PrintConfig["paper"] })
            }
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </div>

        <div className={styles.pdfExportField}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-orientation">
            {t("decks.pdf.orientation")}
          </label>
          <select
            id="pdf-orientation"
            className="form-select form-select-sm"
            value={config.orientation}
            onChange={(event) =>
              onChange({
                ...config,
                orientation: event.target.value as PrintConfig["orientation"],
              })
            }
          >
            <option value="landscape">{t("decks.pdf.orientation.landscape")}</option>
            <option value="portrait">{t("decks.pdf.orientation.portrait")}</option>
          </select>
        </div>

        <div className={`${styles.pdfExportField} ${styles.pdfExportFieldMode}`}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-mode">
            {t("decks.pdf.mode")}
          </label>
          <select
            id="pdf-mode"
            className="form-select form-select-sm"
            value={config.mode}
            onChange={(event) =>
              onChange({ ...config, mode: event.target.value as PrintConfig["mode"] })
            }
          >
            <option value="frontAndBack">{t("decks.pdf.mode.frontBack")}</option>
            <option value="frontsOnly">{t("decks.pdf.mode.fronts")}</option>
          </select>
        </div>
      </div>

      {showCardSizeFields ? (
        <div className={styles.pdfExportSection}>
          <div className={styles.pdfExportField}>
            <div className={styles.pdfExportFieldLabel}>{t("decks.pdf.cardSize" as never)}</div>
            <div className={styles.pdfExportInlineGrid2}>
              <input
                id="pdf-card-width"
                type="number"
                className="form-control form-control-sm"
                min={1}
                step="0.1"
                value={config.cardMm.width}
                onChange={(event) =>
                  onChange({
                    ...config,
                    cardMm: { ...config.cardMm, width: Number(event.target.value) || 1 },
                  })
                }
              />
              <input
                type="number"
                className="form-control form-control-sm"
                min={1}
                step="0.1"
                value={config.cardMm.height}
                onChange={(event) =>
                  onChange({
                    ...config,
                    cardMm: { ...config.cardMm, height: Number(event.target.value) || 1 },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.pdfExportRowSecondary}>
        <PdfDuplexPresetField
          disabled={config.mode !== "frontAndBack"}
          value={config.duplexPreset ?? "normal"}
          onChange={(duplexPreset) => onChange({ ...config, duplexPreset })}
        />

        <div className={`${styles.pdfExportField} ${styles.pdfExportFieldBleedSource}`}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-bleed-source">
            {t("decks.pdf.bleedSource" as never)}
          </label>
          <select
            id="pdf-bleed-source"
            className="form-select form-select-sm"
            value={config.bleedMode}
            onChange={(event) =>
              onChange({ ...config, bleedMode: event.target.value as PrintConfig["bleedMode"] })
            }
          >
            <option value="bakedInImage">
              {t("decks.pdf.bleedSource.bakedInImage" as never)}
            </option>
            <option value="layoutBleed">
              {t("decks.pdf.bleedSource.layoutBleed" as never)}
            </option>
          </select>
        </div>

        <div className={`${styles.pdfExportField} ${styles.pdfExportFieldBleedAmount}`}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-bleed-mm">
            {t("decks.pdf.bleedPerEdge" as never)}
          </label>
          <div className={styles.pdfBleedInputRow}>
            <input
              id="pdf-bleed-mm"
              type="number"
              className={`form-control form-control-sm ${styles.pdfBleedInput}`}
              min={0}
              step="0.1"
              value={config.bleedMm ?? 0}
              onChange={(event) =>
                onChange({
                  ...config,
                  bleedMm: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
            <span className={styles.pdfBleedUnit}>mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
