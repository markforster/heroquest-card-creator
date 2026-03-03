"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import ColorPickerField from "@/components/common/ColorPickerField";
import { useI18n } from "@/i18n/I18nProvider";
import { usePopupState } from "@/hooks/usePopupState";
import {
  DEFAULT_BLEED_PX,
  DEFAULT_CROP_MARK_COLOR,
  DEFAULT_CROP_MARK_STYLE,
  DEFAULT_CUT_MARK_COLOR,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  normalizeBleedPx,
  normalizeColor,
} from "@/lib/export-settings";
import {
  DEFAULT_CROP_MARK_LENGTH,
  DEFAULT_CROP_MARK_THICKNESS,
  DEFAULT_CUT_MARK_OFFSET,
} from "@/lib/bleed-export";

const CROP_SWATCHES = ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#00FF00"];

export type ExportPromptResult = {
  bleedPx: number;
  cropMarks: { enabled: boolean; color: string; style: "lines" | "squares" };
  cutMarks: { enabled: boolean; color: string };
  roundedCorners: boolean;
};

type ExportBleedPromptProps = {
  isOpen: boolean;
  initialBleedEnabled?: boolean;
  initialBleedPx?: number;
  initialCropMarksEnabled?: boolean;
  initialCropMarkColor?: string;
  initialCropMarkStyle?: "lines" | "squares";
  initialCutMarksEnabled?: boolean;
  initialCutMarkColor?: string;
  initialRoundedCorners?: boolean;
  onConfirm: (result: ExportPromptResult) => void;
  onCancel: () => void;
};

export default function ExportBleedPrompt({
  isOpen,
  initialBleedEnabled = false,
  initialBleedPx = DEFAULT_BLEED_PX,
  initialCropMarksEnabled = false,
  initialCropMarkColor = "#00FFFF",
  initialCropMarkStyle = DEFAULT_CROP_MARK_STYLE,
  initialCutMarksEnabled = false,
  initialCutMarkColor = DEFAULT_CUT_MARK_COLOR,
  initialRoundedCorners = DEFAULT_EXPORT_ROUNDED_CORNERS,
  onConfirm,
  onCancel,
}: ExportBleedPromptProps) {
  const { t } = useI18n();
  const [bleedEnabled, setBleedEnabled] = useState(initialBleedEnabled);
  const [bleedPx, setBleedPx] = useState(normalizeBleedPx(initialBleedPx));
  const [cropMarksEnabled, setCropMarksEnabled] = useState(initialCropMarksEnabled);
  const [cropMarkColor, setCropMarkColor] = useState(normalizeColor(initialCropMarkColor));
  const [cropMarkStyle, setCropMarkStyle] =
    useState<"lines" | "squares">(initialCropMarkStyle);
  const [cutMarksEnabled, setCutMarksEnabled] = useState(initialCutMarksEnabled);
  const [cutMarkColor, setCutMarkColor] = useState(normalizeColor(initialCutMarkColor));
  const [roundedCorners, setRoundedCorners] = useState(initialRoundedCorners);
  const cropColorPopover = usePopupState();
  const cutColorPopover = usePopupState();

  useEffect(() => {
    if (!isOpen) return;
    setBleedEnabled(initialBleedEnabled);
    setBleedPx(normalizeBleedPx(initialBleedPx));
    setCropMarksEnabled(initialCropMarksEnabled);
    setCropMarkColor(normalizeColor(initialCropMarkColor));
    setCropMarkStyle(initialCropMarkStyle);
    setCutMarksEnabled(initialCutMarksEnabled);
    setCutMarkColor(normalizeColor(initialCutMarkColor));
    setRoundedCorners(initialRoundedCorners);
  }, [
    isOpen,
    initialBleedEnabled,
    initialBleedPx,
    initialCropMarksEnabled,
    initialCropMarkColor,
    initialCropMarkStyle,
    initialCutMarksEnabled,
    initialCutMarkColor,
    initialRoundedCorners,
  ]);

  useEffect(() => {
    if (!bleedEnabled && cropMarksEnabled) {
      setCropMarksEnabled(false);
    }
  }, [bleedEnabled, cropMarksEnabled]);

  const finalSize = useMemo(() => {
    const cutPad = cutMarksEnabled ? DEFAULT_CUT_MARK_OFFSET + DEFAULT_CROP_MARK_THICKNESS : 0;
    const pad = Math.max(
      bleedEnabled ? bleedPx : 0,
      bleedEnabled && cropMarksEnabled ? DEFAULT_CROP_MARK_LENGTH : 0,
      cutPad,
    );
    return `${750 + pad * 2} x ${1050 + pad * 2}px`;
  }, [bleedEnabled, bleedPx, cropMarksEnabled]);

  const handleConfirm = () => {
    onConfirm({
      bleedPx: bleedEnabled ? normalizeBleedPx(bleedPx) : 0,
      cropMarks: {
        enabled: bleedEnabled ? cropMarksEnabled : false,
        color: normalizeColor(cropMarkColor),
        style: cropMarkStyle,
      },
      cutMarks: {
        enabled: cutMarksEnabled,
        color: normalizeColor(cutMarkColor),
      },
      roundedCorners,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("heading.exportOptions")}
      footer={
        <div className="d-flex gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            {t("actions.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            {t("actions.export")}
          </button>
        </div>
      }
    >
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={bleedEnabled}
            onChange={(event) => setBleedEnabled(event.target.checked)}
          />
          {t("label.includeBleed")}
        </label>
        <label className={styles.settingsPanelRange}>
          {t("label.bleedPixels")}
          <input
            type="range"
            min={0}
            max={36}
            value={bleedPx}
            disabled={!bleedEnabled}
            onChange={(event) => setBleedPx(Number(event.target.value))}
          />
          <div className={styles.settingsPanelRow}>
            <span>{bleedPx}px</span>
            <span>{t("label.finalSize")}: {finalSize}</span>
          </div>
        </label>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={roundedCorners}
            disabled={bleedEnabled || cropMarksEnabled}
            onChange={(event) => setRoundedCorners(event.target.checked)}
          />
          {t("label.exportRoundedCorners")}
        </label>
      </div>

      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={cropMarksEnabled}
            disabled={!bleedEnabled}
            onChange={(event) => setCropMarksEnabled(event.target.checked)}
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
          onChange={(value) => setCropMarkColor(normalizeColor(value))}
          allowAlpha={false}
          onSelectDefault={() => setCropMarkColor(DEFAULT_CROP_MARK_COLOR)}
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
            onChange={(event) => setCropMarkStyle(event.target.value as "lines" | "squares")}
          >
            <option value="lines">{t("label.cropMarkStyleLines")}</option>
            <option value="squares">{t("label.cropMarkStyleSquares")}</option>
          </select>
        </label>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={cutMarksEnabled}
            onChange={(event) => setCutMarksEnabled(event.target.checked)}
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
          onChange={(value) => setCutMarkColor(normalizeColor(value))}
          allowAlpha={false}
          onSelectDefault={() => setCutMarkColor(DEFAULT_CUT_MARK_COLOR)}
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
          isDisabled={!cutMarksEnabled}
        />
      </div>
    </ModalShell>
  );
}
