"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import PdfExportProgressModal from "@/components/Export/PdfExportProgressModal";
import { resolvePdfExportBleedOptions } from "@/components/Export/pdfExportBleed";
import {
  formatPdfExportBleedSummary,
  formatPdfExportLayoutSummary,
} from "@/components/Export/pdfExportSummaryText";
import ExportOptionsForm, {
  type ExportOptionsFormState,
} from "@/components/Export/ExportOptionsForm";
import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import { useI18n } from "@/i18n/I18nProvider";
import {
  DEFAULT_PDF_PRINT_CONFIG,
  normalizePdfPrintConfig,
  renderPdf,
  type LayoutPlan,
  type PrintComposition,
  type PrintConfig,
} from "@/lib/pdf-export";

type ResolvedBleedOptions = ReturnType<typeof resolvePdfExportBleedOptions>;

export type PdfExportShellState = {
  config: PrintConfig;
  bleedOptions: ExportOptionsFormState;
  layoutMode: "default" | "custom";
  bleedMode: "default" | "custom";
  effectiveConfig: PrintConfig;
  effectiveBleedOptions: ExportOptionsFormState;
  resolvedBleedOptions: ResolvedBleedOptions;
};

export type PdfExportRun = {
  composition: PrintComposition;
  config: PrintConfig;
  fileName: string;
  includeCalibrationPage?: boolean;
  layout: LayoutPlan;
  renderFacePngBytes: (faceId: string) => Promise<Uint8Array | null>;
};

type PdfExportShellModalProps = {
  isOpen: boolean;
  title: string;
  hasExportableContent: boolean;
  onCancel: () => void;
  onStateChange?: (state: PdfExportShellState) => void;
  buildExportRun: (state: PdfExportShellState) => Promise<PdfExportRun | null> | PdfExportRun | null;
  buildAlignmentExportRun?: (state: PdfExportShellState) => Promise<PdfExportRun | null> | PdfExportRun | null;
  topContent?: ReactNode | ((state: PdfExportShellState) => ReactNode);
  children?: ReactNode;
};

function countFaces(composition: PrintComposition, mode: PrintConfig["mode"]) {
  return composition.sheets.reduce((sum, sheet) => {
    for (const slot of sheet.slots) {
      if (slot.frontId) sum += 1;
      if (mode === "frontAndBack" && slot.backId) sum += 1;
    }
    return sum;
  }, 0);
}

export default function PdfExportShellModal({
  isOpen,
  title,
  hasExportableContent,
  onCancel,
  onStateChange,
  buildExportRun,
  buildAlignmentExportRun,
  topContent,
  children,
}: PdfExportShellModalProps) {
  const { t } = useI18n();
  const { settings: exportSettings } = useExportSettingsState();
  const pdfSettings = exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG;
  const defaultConfig = useMemo(
    () => normalizePdfPrintConfig(pdfSettings),
    [
      pdfSettings.paper,
      pdfSettings.orientation,
      pdfSettings.marginsMm.top,
      pdfSettings.marginsMm.right,
      pdfSettings.marginsMm.bottom,
      pdfSettings.marginsMm.left,
      pdfSettings.gapMm.x,
      pdfSettings.gapMm.y,
      pdfSettings.cardMm.width,
      pdfSettings.cardMm.height,
      pdfSettings.mode,
      pdfSettings.bleedMode,
      pdfSettings.bleedMm,
      pdfSettings.duplexPreset,
    ],
  );
  const defaultBleedOptions = useMemo<ExportOptionsFormState>(
    () => ({
      bleedEnabled: exportSettings.bleed.enabled,
      bleedPx: exportSettings.bleed.bleedPx,
      askBeforeExport: false,
      roundedCorners: exportSettings.roundedCorners,
      cropMarksEnabled: exportSettings.cropMarks.enabled,
      cropMarkColor: exportSettings.cropMarks.color,
      cropMarkStyle: exportSettings.cropMarks.style ?? "lines",
      cutMarksEnabled: exportSettings.cutMarks.enabled,
      cutMarkColor: exportSettings.cutMarks.color,
    }),
    [
      exportSettings.bleed.enabled,
      exportSettings.bleed.bleedPx,
      exportSettings.roundedCorners,
      exportSettings.cropMarks.enabled,
      exportSettings.cropMarks.color,
      exportSettings.cropMarks.style,
      exportSettings.cutMarks.enabled,
      exportSettings.cutMarks.color,
    ],
  );
  const [config, setConfig] = useState<PrintConfig>(defaultConfig);
  const [bleedOptions, setBleedOptions] = useState<ExportOptionsFormState>(defaultBleedOptions);
  const [layoutMode, setLayoutMode] = useState<"default" | "custom">("default");
  const [bleedMode, setBleedMode] = useState<"default" | "custom">("default");
  const [isExporting, setIsExporting] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressPhase, setProgressPhase] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelRequestedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(defaultConfig);
    setBleedOptions(defaultBleedOptions);
    setLayoutMode("default");
    setBleedMode("default");
    setIsExporting(false);
    setIsProgressOpen(false);
    setProgressCurrent(0);
    setProgressTotal(0);
    setProgressPhase(null);
    setIsCancelling(false);
    cancelRequestedRef.current = false;
  }, [defaultBleedOptions, defaultConfig, isOpen]);

  const effectiveConfig = layoutMode === "custom" ? config : defaultConfig;
  const effectiveBleedOptions = bleedMode === "custom" ? bleedOptions : defaultBleedOptions;
  const resolvedBleedOptions = useMemo(
    () =>
      resolvePdfExportBleedOptions({
        bleedEnabled: effectiveBleedOptions.bleedEnabled,
        bleedPx: effectiveBleedOptions.bleedPx,
        roundedCorners: effectiveBleedOptions.roundedCorners,
        cropMarksEnabled: effectiveBleedOptions.cropMarksEnabled,
        cropMarkColor: effectiveBleedOptions.cropMarkColor,
        cropMarkStyle: effectiveBleedOptions.cropMarkStyle,
        cutMarksEnabled: effectiveBleedOptions.cutMarksEnabled,
        cutMarkColor: effectiveBleedOptions.cutMarkColor,
      }),
    [effectiveBleedOptions],
  );

  const shellState = useMemo<PdfExportShellState>(
    () => ({
      config,
      bleedOptions,
      layoutMode,
      bleedMode,
      effectiveConfig,
      effectiveBleedOptions,
      resolvedBleedOptions,
    }),
    [
      bleedMode,
      bleedOptions,
      config,
      effectiveBleedOptions,
      effectiveConfig,
      layoutMode,
      resolvedBleedOptions,
    ],
  );

  useEffect(() => {
    onStateChange?.(shellState);
  }, [onStateChange, shellState]);

  const layoutSummary = formatPdfExportLayoutSummary(effectiveConfig, t);
  const bleedSummary = formatPdfExportBleedSummary(effectiveBleedOptions, t);
  const showLayoutForm = layoutMode !== "default";
  const showBleedForm = bleedMode !== "default";
  const cancelLabel = t("actions.cancel");
  const exportLabel = t("decks.pdf.modal.export");
  const exportingLabel = t("actions.exporting");
  const exportAlignmentTestLabel = t("decks.pdf.modal.exportAlignmentTest");
  const layoutLabel = t("decks.pdf.summary.layout.label" as never);
  const customizeLayoutLabel = t("decks.pdf.summary.layout.customize" as never);
  const bleedSettingsLabel = t("decks.pdf.summary.bleedSettings.label" as never);
  const customizeBleedSettingsLabel = t("decks.pdf.summary.bleedSettings.customize" as never);

  const closeProgress = useCallback(() => {
    setIsProgressOpen(false);
    setProgressCurrent(0);
    setProgressTotal(0);
    setProgressPhase(null);
    setIsCancelling(false);
    cancelRequestedRef.current = false;
  }, []);

  const executeRun = useCallback(
    async (buildRun: PdfExportShellModalProps["buildExportRun"]) => {
      const run = await buildRun(shellState);
      if (!run) return;

      const totalFaces = countFaces(run.composition, run.config.mode);
      cancelRequestedRef.current = false;
      setIsCancelling(false);
      setProgressCurrent(0);
      setProgressTotal(totalFaces);
      setProgressPhase(t("status.exportingImages"));
      setIsProgressOpen(true);
      setIsExporting(true);

      try {
        const pdfResult = await renderPdf({
          config: run.config,
          layout: run.layout,
          composition: run.composition,
          fileName: run.fileName,
          renderFacePngBytes: run.renderFacePngBytes,
          shouldCancel: () => cancelRequestedRef.current,
          includeCalibrationPage: run.includeCalibrationPage ?? true,
          onPhase: (phase) => {
            setProgressPhase(
              phase === "finalizing" ? t("status.finalizing") : t("status.exportingImages"),
            );
          },
          onProgress: ({ completedFaces, totalFaces: total }) => {
            setProgressCurrent(completedFaces);
            setProgressTotal(total);
          },
        });
        if (pdfResult.status === "cancelled") {
          return;
        }
        const url = URL.createObjectURL(pdfResult.blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = pdfResult.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[pdf-export] PDF export failed", error);
        window.alert(t("alert.exportImagesFailed"));
      } finally {
        setIsExporting(false);
        closeProgress();
      }
    },
    [closeProgress, shellState, t],
  );

  const resolvedTopContent =
    typeof topContent === "function" ? topContent(shellState) : topContent;

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onCancel}
        title={title}
        contentClassName={styles.settingsPopover}
        footer={
          <ActionBar
            right={
              <>
                <button type="button" className="btn btn-outline-light btn-sm" onClick={onCancel}>
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  disabled={!hasExportableContent || isExporting || !buildAlignmentExportRun}
                  onClick={() => {
                    if (!buildAlignmentExportRun) return;
                    void executeRun(buildAlignmentExportRun);
                  }}
                >
                  {exportAlignmentTestLabel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!hasExportableContent || isExporting}
                  onClick={() => {
                    void executeRun(buildExportRun);
                  }}
                >
                  {isExporting ? exportingLabel : exportLabel}
                </button>
              </>
            }
          />
        }
      >
        <div className={styles.settingsPanelScroll}>
          <div className={styles.settingsPanelBody}>
            {resolvedTopContent}
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
              <div className={styles.deckPdfSummaryInlineControl}>
                <div className={styles.deckPdfSummaryInlineHeader}>
                  <span className={styles.deckPdfSummaryInlineLabel}>{layoutLabel}:</span>
                  <span className={styles.deckPdfSummaryInlineSummary}>{layoutSummary}</span>
                </div>
                <div className={`form-check form-switch m-0 ${styles.deckPdfSummaryToggle}`}>
                  <span className={`form-check-label ${styles.deckPdfSummaryToggleLabel}`}>
                    {customizeLayoutLabel}
                  </span>
                  <input
                    type="checkbox"
                    className="form-check-input hq-toggle"
                    checked={layoutMode === "custom"}
                    onChange={(event) => setLayoutMode(event.target.checked ? "custom" : "default")}
                    aria-label={customizeLayoutLabel}
                  />
                </div>
              </div>
              {showLayoutForm ? <PdfExportConfigForm config={config} onChange={setConfig} /> : null}
            </div>
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
              <div className={styles.deckPdfSummaryInlineControl}>
                <div className={styles.deckPdfSummaryInlineHeader}>
                  <span className={styles.deckPdfSummaryInlineLabel}>{bleedSettingsLabel}:</span>
                  <span className={styles.deckPdfSummaryInlineSummary}>{bleedSummary}</span>
                </div>
                <div className={`form-check form-switch m-0 ${styles.deckPdfSummaryToggle}`}>
                  <span className={`form-check-label ${styles.deckPdfSummaryToggleLabel}`}>
                    {customizeBleedSettingsLabel}
                  </span>
                  <input
                    type="checkbox"
                    className="form-check-input hq-toggle"
                    checked={bleedMode === "custom"}
                    onChange={(event) => setBleedMode(event.target.checked ? "custom" : "default")}
                    aria-label={customizeBleedSettingsLabel}
                  />
                </div>
              </div>
              {showBleedForm ? (
                <ExportOptionsForm
                  {...bleedOptions}
                  bleedLabelKey="label.exportWithBleed"
                  headingLabelKey="heading.exportSettings"
                  onChange={(next) => setBleedOptions((prev) => ({ ...prev, ...next }))}
                  sectionLayout="columns"
                  useSettingsGroup
                />
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </ModalShell>
      <PdfExportProgressModal
        isOpen={isProgressOpen}
        title={`${exportLabel} (${progressTotal})`}
        progress={progressCurrent}
        total={progressTotal}
        phaseLabel={progressPhase}
        isCancelling={isCancelling}
        onCancel={() => {
          cancelRequestedRef.current = true;
          setIsCancelling(true);
        }}
      />
    </>
  );
}
