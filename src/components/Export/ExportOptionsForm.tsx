"use client";

import { useEffect } from "react";

import styles from "@/app/page.module.css";
import ColorPickerField from "@/components/common/ColorPickerField";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import { DEFAULT_CROP_MARK_COLOR, DEFAULT_CUT_MARK_COLOR } from "@/lib/export-settings";

const CROP_SWATCHES = ["#00FFFF", "#FF00FF", "#FFFF00", "#000000", "#00FF00"];

export type ExportOptionsFormState = {
  bleedEnabled: boolean;
  bleedPx: number;
  askBeforeExport?: boolean;
  roundedCorners: boolean;
  cropMarksEnabled: boolean;
  cropMarkColor: string;
  cropMarkStyle: "lines" | "squares";
  cutMarksEnabled: boolean;
  cutMarkColor: string;
};

type ExportOptionsFormProps = ExportOptionsFormState & {
  bleedLabelKey: MessageKey;
  headingLabelKey?: MessageKey;
  finalSizeLabel?: string;
  showAskBeforeExport?: boolean;
  useSettingsGroup?: boolean;
  onChange: (next: Partial<ExportOptionsFormState>) => void;
};

export default function ExportOptionsForm({
  bleedEnabled,
  bleedPx,
  askBeforeExport,
  roundedCorners,
  cropMarksEnabled,
  cropMarkColor,
  cropMarkStyle,
  cutMarksEnabled,
  cutMarkColor,
  bleedLabelKey,
  headingLabelKey,
  finalSizeLabel,
  showAskBeforeExport = false,
  useSettingsGroup = false,
  onChange,
}: ExportOptionsFormProps) {
  const { t } = useI18n();
  const cropColorPopover = usePopupState();
  const cutColorPopover = usePopupState();

  useEffect(() => {
    if (!bleedEnabled && (cropMarksEnabled || cutMarksEnabled)) {
      onChange({ cropMarksEnabled: false, cutMarksEnabled: false });
    }
  }, [bleedEnabled, cropMarksEnabled, cutMarksEnabled, onChange]);

  return (
    <>
      {useSettingsGroup ? (
        <SettingsGroup
          title={headingLabelKey ? t(headingLabelKey) : undefined}
          className="d-flex flex-column gap-3"
        >
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={bleedEnabled}
              onChange={(event) => onChange({ bleedEnabled: event.target.checked })}
            />
            {t(bleedLabelKey)}
          </label>
          <label className={styles.settingsPanelRange}>
            {t("label.bleedPixels")}
            <input
              type="range"
              min={0}
              max={36}
              value={bleedPx}
              disabled={!bleedEnabled}
              onChange={(event) => onChange({ bleedPx: Number(event.target.value) })}
            />
            <div className={styles.settingsPanelRow}>
              <span>{bleedPx}px</span>
              {finalSizeLabel ? <span>{t("label.finalSize")}: {finalSizeLabel}</span> : null}
            </div>
          </label>
          {showAskBeforeExport ? (
            <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
              <input
                type="checkbox"
                className="form-check-input hq-checkbox"
                checked={Boolean(askBeforeExport)}
                onChange={(event) => onChange({ askBeforeExport: event.target.checked })}
              />
              {t("label.askBeforeExport")}
            </label>
          ) : null}
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={roundedCorners}
              disabled={bleedEnabled || cropMarksEnabled}
              onChange={(event) => onChange({ roundedCorners: event.target.checked })}
            />
            {t("label.exportRoundedCorners")}
          </label>
        </SettingsGroup>
      ) : (
        <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
          {headingLabelKey ? (
            <div className={styles.settingsPanelSectionTitle}>{t(headingLabelKey)}</div>
          ) : null}
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={bleedEnabled}
              onChange={(event) => onChange({ bleedEnabled: event.target.checked })}
            />
            {t(bleedLabelKey)}
          </label>
          <label className={styles.settingsPanelRange}>
            {t("label.bleedPixels")}
            <input
              type="range"
              min={0}
              max={36}
              value={bleedPx}
              disabled={!bleedEnabled}
              onChange={(event) => onChange({ bleedPx: Number(event.target.value) })}
            />
            <div className={styles.settingsPanelRow}>
              <span>{bleedPx}px</span>
              {finalSizeLabel ? <span>{t("label.finalSize")}: {finalSizeLabel}</span> : null}
            </div>
          </label>
          {showAskBeforeExport ? (
            <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
              <input
                type="checkbox"
                className="form-check-input hq-checkbox"
                checked={Boolean(askBeforeExport)}
                onChange={(event) => onChange({ askBeforeExport: event.target.checked })}
              />
              {t("label.askBeforeExport")}
            </label>
          ) : null}
          <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
            <input
              type="checkbox"
              className="form-check-input hq-checkbox"
              checked={roundedCorners}
              disabled={bleedEnabled || cropMarksEnabled}
              onChange={(event) => onChange({ roundedCorners: event.target.checked })}
            />
            {t("label.exportRoundedCorners")}
          </label>
        </div>
      )}

      {useSettingsGroup ? (
        <SettingsGroup className="d-flex flex-column gap-3">
          <div className={styles.exportMarksGrid}>
            <div className={styles.exportMarksColumn}>
              <label
                className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}
              >
                <input
                  type="checkbox"
                  className="form-check-input hq-checkbox"
                  checked={cropMarksEnabled}
                  disabled={!bleedEnabled}
                  onChange={(event) => onChange({ cropMarksEnabled: event.target.checked })}
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
                onChange={(value) => onChange({ cropMarkColor: value })}
                allowAlpha={false}
                onSelectDefault={() => onChange({ cropMarkColor: DEFAULT_CROP_MARK_COLOR })}
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
                    onChange({ cropMarkStyle: event.target.value as "lines" | "squares" })
                  }
                >
                  <option value="lines">{t("label.cropMarkStyleLines")}</option>
                  <option value="squares">{t("label.cropMarkStyleSquares")}</option>
                </select>
              </label>
            </div>
            <div className={styles.exportMarksColumn}>
              <label
                className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}
              >
                <input
                  type="checkbox"
                  className="form-check-input hq-checkbox"
                  checked={cutMarksEnabled}
                  disabled={!bleedEnabled}
                  onChange={(event) => onChange({ cutMarksEnabled: event.target.checked })}
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
                onChange={(value) => onChange({ cutMarkColor: value })}
                allowAlpha={false}
                onSelectDefault={() => onChange({ cutMarkColor: DEFAULT_CUT_MARK_COLOR })}
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
          </div>
        </SettingsGroup>
      ) : (
        <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
          <div className={styles.exportMarksGrid}>
            <div className={styles.exportMarksColumn}>
              <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
                <input
                  type="checkbox"
                  className="form-check-input hq-checkbox"
                  checked={cropMarksEnabled}
                  disabled={!bleedEnabled}
                  onChange={(event) => onChange({ cropMarksEnabled: event.target.checked })}
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
                onChange={(value) => onChange({ cropMarkColor: value })}
                allowAlpha={false}
                onSelectDefault={() => onChange({ cropMarkColor: DEFAULT_CROP_MARK_COLOR })}
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
                    onChange({ cropMarkStyle: event.target.value as "lines" | "squares" })
                  }
                >
                  <option value="lines">{t("label.cropMarkStyleLines")}</option>
                  <option value="squares">{t("label.cropMarkStyleSquares")}</option>
                </select>
              </label>
            </div>
            <div className={styles.exportMarksColumn}>
              <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
                <input
                  type="checkbox"
                  className="form-check-input hq-checkbox"
                  checked={cutMarksEnabled}
                  disabled={!bleedEnabled}
                  onChange={(event) => onChange({ cutMarksEnabled: event.target.checked })}
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
                onChange={(value) => onChange({ cutMarkColor: value })}
                allowAlpha={false}
                onSelectDefault={() => onChange({ cutMarkColor: DEFAULT_CUT_MARK_COLOR })}
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
          </div>
        </div>
      )}
    </>
  );
}
