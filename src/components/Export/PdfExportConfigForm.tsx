"use client";

import styles from "@/app/page.module.css";
import FormSelect from "@/components/common/FormSelect";
import PdfDuplexPresetField from "@/components/Export/PdfDuplexPresetField";
import { useI18n } from "@/i18n/I18nProvider";
import type { PrintConfig } from "@/lib/pdf-export";

type PdfExportConfigFormProps = {
  config: PrintConfig;
  hiddenFields?: {
    mode?: boolean;
    duplexPreset?: boolean;
  };
  onChange: (next: PrintConfig) => void;
};

export default function PdfExportConfigForm({
  config,
  hiddenFields,
  onChange,
}: PdfExportConfigFormProps) {
  const { t } = useI18n();
  const showCardSizeFields = false;

  return (
    <div className={`${styles.settingsGroup} ${styles.pdfExportForm}`}>
      <div className={styles.pdfExportRow}>
        <div className={styles.pdfExportField}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-paper">
            {t("decks.pdf.paper")}
          </label>
          <FormSelect
            inputId="pdf-paper"
            value={config.paper}
            options={[
              { value: "A4", label: "A4" },
              { value: "Letter", label: "Letter" },
            ]}
            onChange={(paper) => onChange({ ...config, paper: paper as PrintConfig["paper"] })}
          />
        </div>

        <div className={styles.pdfExportField}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-orientation">
            {t("decks.pdf.orientation")}
          </label>
          <FormSelect
            inputId="pdf-orientation"
            value={config.orientation}
            options={[
              { value: "landscape", label: t("decks.pdf.orientation.landscape") },
              { value: "portrait", label: t("decks.pdf.orientation.portrait") },
            ]}
            onChange={(orientation) =>
              onChange({
                ...config,
                orientation: orientation as PrintConfig["orientation"],
              })
            }
          />
        </div>

        {!hiddenFields?.mode ? (
          <div className={`${styles.pdfExportField} ${styles.pdfExportFieldMode}`}>
            <label className={styles.pdfExportFieldLabel} htmlFor="pdf-mode">
              {t("decks.pdf.mode")}
            </label>
            <FormSelect
              inputId="pdf-mode"
              value={config.mode}
              options={[
                { value: "frontAndBack", label: t("decks.pdf.mode.frontBack") },
                { value: "frontsOnly", label: t("decks.pdf.mode.fronts") },
              ]}
              onChange={(mode) => onChange({ ...config, mode: mode as PrintConfig["mode"] })}
            />
          </div>
        ) : null}
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
        {!hiddenFields?.duplexPreset ? (
          <PdfDuplexPresetField
            disabled={config.mode !== "frontAndBack"}
            value={config.duplexPreset ?? "normal"}
            onChange={(duplexPreset) => onChange({ ...config, duplexPreset })}
          />
        ) : null}

        <div className={`${styles.pdfExportField} ${styles.pdfExportFieldBleedSource}`}>
          <label className={styles.pdfExportFieldLabel} htmlFor="pdf-bleed-source">
            {t("decks.pdf.bleedSource" as never)}
          </label>
          <FormSelect
            inputId="pdf-bleed-source"
            value={config.bleedMode}
            options={[
              {
                value: "bakedInImage",
                label: t("decks.pdf.bleedSource.bakedInImage" as never),
              },
              {
                value: "layoutBleed",
                label: t("decks.pdf.bleedSource.layoutBleed" as never),
              },
            ]}
            onChange={(bleedMode) =>
              onChange({ ...config, bleedMode: bleedMode as PrintConfig["bleedMode"] })
            }
          />
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
