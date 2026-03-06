"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ExportOptionsForm from "@/components/Export/ExportOptionsForm";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import {
  DEFAULT_BLEED_PX,
  DEFAULT_CROP_MARK_COLOR,
  DEFAULT_CROP_MARK_STYLE,
  DEFAULT_CUT_MARK_COLOR,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  normalizeBleedPx,
  normalizeColor,
} from "@/lib/export-settings";

export default function ExportSettingsPanel() {
  const { settings, updateSettings } = useExportSettingsState();
  const [bleedEnabled, setBleedEnabled] = useState(settings.bleed.enabled);
  const [bleedPx, setBleedPx] = useState(settings.bleed.bleedPx ?? DEFAULT_BLEED_PX);
  const [askBeforeExport, setAskBeforeExport] = useState(settings.bleed.askBeforeExport);
  const [cropMarksEnabled, setCropMarksEnabled] = useState(settings.cropMarks.enabled);
  const [cropMarkColor, setCropMarkColor] = useState(
    settings.cropMarks.color ?? DEFAULT_CROP_MARK_COLOR,
  );
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
    return `${CARD_WIDTH + bleed * 2} x ${CARD_HEIGHT + bleed * 2}px`;
  }, [bleedPx]);

  const persist = useCallback((next: {
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
  }, [
    askBeforeExport,
    bleedEnabled,
    bleedPx,
    cropMarkColor,
    cropMarkStyle,
    cropMarksEnabled,
    cutMarkColor,
    cutMarksEnabled,
    roundedCorners,
    updateSettings,
  ]);

  return (
    <div className={styles.settingsPanelBody}>
      <ExportOptionsForm
        bleedEnabled={bleedEnabled}
        bleedPx={bleedPx}
        askBeforeExport={askBeforeExport}
        roundedCorners={roundedCorners}
        cropMarksEnabled={cropMarksEnabled}
        cropMarkColor={cropMarkColor}
        cropMarkStyle={cropMarkStyle}
        cutMarksEnabled={cutMarksEnabled}
        cutMarkColor={cutMarkColor}
        bleedLabelKey="label.exportWithBleed"
        headingLabelKey="heading.exportSettings"
        finalSizeLabel={finalSizeLabel}
        showAskBeforeExport
        useSettingsGroup
        onChange={persist}
      />
    </div>
  );
}
