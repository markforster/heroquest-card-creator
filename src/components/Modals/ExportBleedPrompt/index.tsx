"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import ExportProfileSelect from "@/components/Export/ExportProfileSelect";
import ExportOptionsForm from "@/components/Export/ExportOptionsForm";
import { CARD_HEIGHT, CARD_WIDTH } from "@/config/card-canvas";
import { useI18n } from "@/i18n/I18nProvider";
import type { ExportProfile } from "@/lib/export-profiles";
import {
  DEFAULT_CROP_MARK_LENGTH,
  DEFAULT_CROP_MARK_THICKNESS,
  DEFAULT_CUT_MARK_OFFSET,
} from "@/lib/bleed-export";
import {
  DEFAULT_BLEED_PX,
  DEFAULT_CROP_MARK_STYLE,
  DEFAULT_CUT_MARK_COLOR,
  DEFAULT_CUT_MARK_STYLE,
  DEFAULT_EXPORT_ROUNDED_CORNERS,
  normalizeBleedPx,
  normalizeColor,
} from "@/lib/export-settings";

export type ExportPromptResult = {
  bleedPx: number;
  cropMarks: { enabled: boolean; color: string; style: "lines" | "squares" | "triangles" };
  cutMarks: {
    enabled: boolean;
    color: string;
    style: "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";
  };
  roundedCorners: boolean;
};

type ExportBleedPromptProps = {
  isOpen: boolean;
  profiles?: ExportProfile[];
  selectedProfileId?: string;
  initialBleedEnabled?: boolean;
  initialBleedPx?: number;
  initialCropMarksEnabled?: boolean;
  initialCropMarkColor?: string;
  initialCropMarkStyle?: "lines" | "squares" | "triangles";
  initialCutMarksEnabled?: boolean;
  initialCutMarkColor?: string;
  initialCutMarkStyle?: "solid" | "dashed" | "long-dashed" | "dotted" | "ticks";
  initialRoundedCorners?: boolean;
  onSelectProfile?: (profileId: string) => void;
  onConfirm: (result: ExportPromptResult) => void;
  onCancel: () => void;
};

export default function ExportBleedPrompt({
  isOpen,
  profiles = [],
  selectedProfileId,
  initialBleedEnabled = false,
  initialBleedPx = DEFAULT_BLEED_PX,
  initialCropMarksEnabled = false,
  initialCropMarkColor = "#00FFFF",
  initialCropMarkStyle = DEFAULT_CROP_MARK_STYLE,
  initialCutMarksEnabled = false,
  initialCutMarkColor = DEFAULT_CUT_MARK_COLOR,
  initialCutMarkStyle = DEFAULT_CUT_MARK_STYLE,
  initialRoundedCorners = DEFAULT_EXPORT_ROUNDED_CORNERS,
  onSelectProfile,
  onConfirm,
  onCancel,
}: ExportBleedPromptProps) {
  const { t } = useI18n();
  const [bleedEnabled, setBleedEnabled] = useState(initialBleedEnabled);
  const [bleedPx, setBleedPx] = useState(normalizeBleedPx(initialBleedPx));
  const [cropMarksEnabled, setCropMarksEnabled] = useState(initialCropMarksEnabled);
  const [cropMarkColor, setCropMarkColor] = useState(normalizeColor(initialCropMarkColor));
  const [cropMarkStyle, setCropMarkStyle] =
    useState<"lines" | "squares" | "triangles">(initialCropMarkStyle);
  const [cutMarksEnabled, setCutMarksEnabled] = useState(initialCutMarksEnabled);
  const [cutMarkColor, setCutMarkColor] = useState(normalizeColor(initialCutMarkColor));
  const [cutMarkStyle, setCutMarkStyle] =
    useState<"solid" | "dashed" | "long-dashed" | "dotted" | "ticks">(initialCutMarkStyle);
  const [roundedCorners, setRoundedCorners] = useState(initialRoundedCorners);

  useEffect(() => {
    if (!isOpen) return;
    setBleedEnabled(initialBleedEnabled);
    setBleedPx(normalizeBleedPx(initialBleedPx));
    setCropMarksEnabled(initialCropMarksEnabled);
    setCropMarkColor(normalizeColor(initialCropMarkColor));
    setCropMarkStyle(initialCropMarkStyle);
    setCutMarksEnabled(initialCutMarksEnabled);
    setCutMarkColor(normalizeColor(initialCutMarkColor));
    setCutMarkStyle(initialCutMarkStyle);
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
    initialCutMarkStyle,
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
    return `${CARD_WIDTH + pad * 2} x ${CARD_HEIGHT + pad * 2}px`;
  }, [bleedEnabled, bleedPx, cropMarksEnabled, cutMarksEnabled]);

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
        style: cutMarkStyle,
      },
      roundedCorners,
    });
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("heading.exportOptions")}
      contentClassName={styles.exportOptionsPopover}
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
      {profiles.length > 0 ? (
        <div className={styles.exportPromptProfileRow}>
          <div className={styles.exportPromptProfileLabel}>{t("label.profile")}</div>
          <div className={styles.exportPromptProfileSelect}>
            <ExportProfileSelect
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              ariaLabel={t("label.profile")}
              onChange={(profileId) => onSelectProfile?.(profileId)}
            />
          </div>
        </div>
      ) : null}
      <ExportOptionsForm
        bleedEnabled={bleedEnabled}
        bleedPx={bleedPx}
        roundedCorners={roundedCorners}
        cropMarksEnabled={cropMarksEnabled}
        cropMarkColor={cropMarkColor}
        cropMarkStyle={cropMarkStyle}
        cutMarksEnabled={cutMarksEnabled}
        cutMarkColor={cutMarkColor}
        cutMarkStyle={cutMarkStyle}
        bleedLabelKey="label.includeBleed"
        finalSizeLabel={finalSize}
        onChange={(next) => {
          if (next.bleedEnabled !== undefined) setBleedEnabled(next.bleedEnabled);
          if (next.bleedPx !== undefined) setBleedPx(next.bleedPx);
          if (next.roundedCorners !== undefined) setRoundedCorners(next.roundedCorners);
          if (next.cropMarksEnabled !== undefined) setCropMarksEnabled(next.cropMarksEnabled);
          if (next.cropMarkColor !== undefined) setCropMarkColor(normalizeColor(next.cropMarkColor));
          if (next.cropMarkStyle !== undefined) setCropMarkStyle(next.cropMarkStyle);
          if (next.cutMarksEnabled !== undefined) setCutMarksEnabled(next.cutMarksEnabled);
          if (next.cutMarkColor !== undefined) setCutMarkColor(normalizeColor(next.cutMarkColor));
          if (next.cutMarkStyle !== undefined) setCutMarkStyle(next.cutMarkStyle);
        }}
      />
    </ModalShell>
  );
}
