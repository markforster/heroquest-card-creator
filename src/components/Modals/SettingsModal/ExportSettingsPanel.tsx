"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useI18n } from "@/i18n/I18nProvider";
import { usePopupState } from "@/hooks/usePopupState";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import {
  DEFAULT_BLEED_PX,
  DEFAULT_CROP_MARK_COLOR,
  DEFAULT_CROP_MARK_STYLE,
  DEFAULT_CUT_MARK_COLOR,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  normalizeBleedPx,
  normalizeColor,
} from "@/lib/export-settings";

const CROP_SWATCHES = ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#00FF00"];

export default function ExportSettingsPanel() {
  const { t } = useI18n();
  const { settings, updateSettings } = useExportSettingsState();
  const [bleedEnabled, setBleedEnabled] = useState(settings.bleed.enabled);
  const [bleedPx, setBleedPx] = useState(settings.bleed.bleedPx ?? DEFAULT_BLEED_PX);
  const [askBeforeExport, setAskBeforeExport] = useState(settings.bleed.askBeforeExport);
  const [cropMarksEnabled, setCropMarksEnabled] = useState(settings.cropMarks.enabled);
  const [cropMarkColor, setCropMarkColor] = useState(settings.cropMarks.color ?? DEFAULT_CROP_MARK_COLOR);
  const [cropMarkStyle, setCropMarkStyle] = useState(
    settings.cropMarks.style ?? DEFAULT_CROP_MARK_STYLE,
  );
  const [cutMarksEnabled, setCutMarksEnabled] = useState(settings.cutMarks.enabled);
  const [cutMarkColor, setCutMarkColor] = useState(
    settings.cutMarks.color ?? DEFAULT_CUT_MARK_COLOR,
  );
  const [roundedCorners, setRoundedCorners] = useState(
    settings.roundedCorners ?? DEFAULT_EXPORT_ROUNDED_CORNERS,
  );
  const cropColorPopover = usePopupState();
  const cutColorPopover = usePopupState();

  useEffect(() => {
    setBleedEnabled(settings.bleed.enabled);
    setBleedPx(settings.bleed.bleedPx ?? DEFAULT_BLEED_PX);
    setAskBeforeExport(settings.bleed.askBeforeExport);
    setCropMarksEnabled(settings.cropMarks.enabled);
    setCropMarkColor(settings.cropMarks.color ?? DEFAULT_CROP_MARK_COLOR);
    setCropMarkStyle(settings.cropMarks.style ?? DEFAULT_CROP_MARK_STYLE);
    setCutMarksEnabled(settings.cutMarks.enabled);
    setCutMarkColor(settings.cutMarks.color ?? DEFAULT_CUT_MARK_COLOR);
    setRoundedCorners(settings.roundedCorners ?? DEFAULT_EXPORT_ROUNDED_CORNERS);
  }, [settings]);

  const finalSizeLabel = useMemo(() => {
    const bleed = normalizeBleedPx(bleedPx);
    return `${750 + bleed * 2} x ${1050 + bleed * 2}px`;
  }, [bleedPx]);

  const persist = (next: {
    bleedEnabled?: boolean;
    bleedPx?: number;
    askBeforeExport?: boolean;
    cropMarksEnabled?: boolean;
    cropMarkColor?: string;
    cropMarkStyle?: "lines" | "squares";
    cutMarksEnabled?: boolean;
    cutMarkColor?: string;
    roundedCorners?: boolean;
  }) => {
    const resolvedBleedEnabled = next.bleedEnabled ?? bleedEnabled;
    const resolvedBleedPx = normalizeBleedPx(next.bleedPx ?? bleedPx);
    const resolvedAsk = next.askBeforeExport ?? askBeforeExport;
    const requestedCropEnabled = next.cropMarksEnabled ?? cropMarksEnabled;
    const resolvedCropColor = normalizeColor(next.cropMarkColor ?? cropMarkColor);
    const resolvedCropStyle = next.cropMarkStyle ?? cropMarkStyle;
    const requestedCutEnabled = next.cutMarksEnabled ?? cutMarksEnabled;
    const resolvedCutColor = normalizeColor(next.cutMarkColor ?? cutMarkColor);
    const resolvedRoundedCorners = next.roundedCorners ?? roundedCorners;
    const resolvedCropEnabled = resolvedBleedEnabled ? requestedCropEnabled : false;
    const resolvedCutEnabled = resolvedBleedEnabled ? requestedCutEnabled : false;

    setBleedEnabled(resolvedBleedEnabled);
    setBleedPx(resolvedBleedPx);
    setAskBeforeExport(resolvedAsk);
    setCropMarksEnabled(resolvedCropEnabled);
    setCropMarkColor(resolvedCropColor);
    setCropMarkStyle(resolvedCropStyle);
    setCutMarksEnabled(resolvedCutEnabled);
    setCutMarkColor(resolvedCutColor);
    setRoundedCorners(resolvedRoundedCorners);

    updateSettings({
      bleed: {
        enabled: resolvedBleedEnabled,
        bleedPx: resolvedBleedPx,
        askBeforeExport: resolvedAsk,
      },
      cropMarks: {
        enabled: resolvedCropEnabled,
        color: resolvedCropColor,
        style: resolvedCropStyle,
      },
      cutMarks: {
        enabled: resolvedCutEnabled,
        color: resolvedCutColor,
      },
      roundedCorners: resolvedRoundedCorners,
    });
  };

  return (
    <div className={styles.settingsPanelBody}>
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <div className={styles.settingsPanelSectionTitle}>{t("heading.exportSettings")}</div>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={bleedEnabled}
            onChange={(event) => persist({ bleedEnabled: event.target.checked })}
          />
          {t("label.exportWithBleed")}
        </label>
        <label className={styles.settingsPanelRange}>
          {t("label.bleedPixels")}
          <input
            type="range"
            min={0}
            max={36}
            value={bleedPx}
            disabled={!bleedEnabled}
            onChange={(event) => persist({ bleedPx: Number(event.target.value) })}
          />
          <div className={styles.settingsPanelRow}>
            <span>{bleedPx}px</span>
            <span>{t("label.finalSize")}: {finalSizeLabel}</span>
          </div>
        </label>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={askBeforeExport}
            onChange={(event) => persist({ askBeforeExport: event.target.checked })}
          />
          {t("label.askBeforeExport")}
        </label>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={roundedCorners}
            disabled={bleedEnabled || cropMarksEnabled}
            onChange={(event) => persist({ roundedCorners: event.target.checked })}
          />
          {t("label.exportRoundedCorners")}
        </label>
      </div>

      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.cropMarks")}</div>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={cropMarksEnabled}
            disabled={!bleedEnabled}
            onChange={(event) => persist({ cropMarksEnabled: event.target.checked })}
          />
          {t("label.cropMarks")}
        </label>
        <ColorPickerField
          label={t("label.cropMarkColor")}
          inputValue={cropMarkColor}
          selectedValue={cropMarkColor}
          defaultColor={DEFAULT_CROP_MARK_COLOR}
          smartGroups={[]}
          isSmartBusy={false}
          onRequestSmart={() => {}}
          onChange={(value) => persist({ cropMarkColor: value })}
          allowAlpha={false}
          onSelectDefault={() => persist({ cropMarkColor: DEFAULT_CROP_MARK_COLOR })}
          onSelectTransparent={() => {}}
          canRevert={false}
          onRevert={() => {}}
          isOpen={cropColorPopover.isOpen}
          onToggleOpen={cropColorPopover.toggle}
          onClose={cropColorPopover.close}
          showInput={false}
          showSmartTab={false}
          showSavedTab={false}
          showDefaultOption={false}
          showTransparentOption={false}
          showRevertOption={false}
          showSaveOption={false}
          presetSwatches={CROP_SWATCHES}
          isDisabled={!cropMarksEnabled}
        />
        <label className={styles.settingsPanelRow}>
          <span>{t("label.cropMarkStyle")}</span>
          <select
            className="form-select form-select-sm"
            value={cropMarkStyle}
            disabled={!cropMarksEnabled || !bleedEnabled}
            onChange={(event) =>
              persist({ cropMarkStyle: event.target.value as "lines" | "squares" })
            }
          >
            <option value="lines">{t("label.cropMarkStyleLines")}</option>
            <option value="squares">{t("label.cropMarkStyleSquares")}</option>
          </select>
        </label>
      </div>

      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.cutMarks")}</div>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={cutMarksEnabled}
            disabled={!bleedEnabled}
            onChange={(event) => persist({ cutMarksEnabled: event.target.checked })}
          />
          {t("label.cutMarks")}
        </label>
        <ColorPickerField
          label={t("label.cutMarkColor")}
          inputValue={cutMarkColor}
          selectedValue={cutMarkColor}
          defaultColor={DEFAULT_CUT_MARK_COLOR}
          smartGroups={[]}
          isSmartBusy={false}
          onRequestSmart={() => {}}
          onChange={(value) => persist({ cutMarkColor: value })}
          allowAlpha={false}
          onSelectDefault={() => persist({ cutMarkColor: DEFAULT_CUT_MARK_COLOR })}
          onSelectTransparent={() => {}}
          canRevert={false}
          onRevert={() => {}}
          isOpen={cutColorPopover.isOpen}
          onToggleOpen={cutColorPopover.toggle}
          onClose={cutColorPopover.close}
          showInput={false}
          showSmartTab={false}
          showSavedTab={false}
          showDefaultOption={false}
          showTransparentOption={false}
          showRevertOption={false}
          showSaveOption={false}
          presetSwatches={CROP_SWATCHES}
          isDisabled={!cutMarksEnabled || !bleedEnabled}
        />
      </div>
    </div>
  );
}
