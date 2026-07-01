"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import CardPreview from "@/components/Cards/CardPreview";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import ActionBar from "@/components/common/ActionBar";
import ModalShell from "@/components/common/ModalShell";
import PdfExportProgressModal from "@/components/Export/PdfExportProgressModal";
import {
  renderPdfCardFacePngBytes,
  renderPdfPlaceholderFacePngBytes,
} from "@/components/Export/pdfExportFaceRendering";
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
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import {
  DEFAULT_PDF_PRINT_CONFIG,
  composePrintComposition,
  computeLayoutPlan,
  getPdfFooterReserveMm,
  normalizePdfPrintConfig,
  renderPdf,
  type LayoutPlan,
  type PrintComposition,
  type PrintConfig,
  type SlotPair,
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
  fileName: string;
  includeCalibrationPage?: boolean;
};

export type PdfExportRunBuildContext = {
  shellState: PdfExportShellState;
  config: PrintConfig;
  layout: LayoutPlan;
};

export type PdfExportSummaryLineTone = "default" | "muted";

export type PdfExportSummaryNoticeTone = PdfExportSummaryLineTone | "blocked";

export type PdfExportSummaryContent = {
  columns: Array<Array<{ text: string; tone?: PdfExportSummaryLineTone }>>;
  notice?: { text: string; tone?: PdfExportSummaryNoticeTone };
};

export type PdfExportPlaceholderSpec = {
  title: string;
  subtitle?: string;
  variant: "empty-front";
};

export type PdfExportShellPolicy = {
  mode?: {
    hidden?: boolean;
    forcedValue?: PrintConfig["mode"];
  };
  duplexPreset?: {
    hidden?: boolean;
    forcedValue?: NonNullable<PrintConfig["duplexPreset"]>;
  };
  alignmentExportHidden?: boolean;
};

export type PdfExportAlignmentRun = PdfExportRun & {
  composition: PrintComposition;
  renderFacePngBytes: (faceId: string) => Promise<Uint8Array | null>;
};

type ExecutablePdfExportRun = PdfExportRun & {
  config: PrintConfig;
  layout: LayoutPlan;
  composition: PrintComposition;
  renderFacePngBytes: (faceId: string) => Promise<Uint8Array | null>;
};

type PdfExportShellModalProps = {
  isOpen: boolean;
  title: string;
  slotPairs: SlotPair[];
  shellPolicy?: PdfExportShellPolicy;
  placeholderLookup?: Record<string, PdfExportPlaceholderSpec>;
  summaryContent?: PdfExportSummaryContent;
  onCancel: () => void;
  onStateChange?: (state: PdfExportShellState) => void;
  buildExportRun: (context: PdfExportRunBuildContext) => Promise<PdfExportRun | null> | PdfExportRun | null;
  buildAlignmentExportRun?: (context: PdfExportRunBuildContext) => Promise<PdfExportAlignmentRun | null> | PdfExportAlignmentRun | null;
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

function applyShellPolicyToConfig(config: PrintConfig, shellPolicy?: PdfExportShellPolicy): PrintConfig {
  const nextConfig = { ...config };

  if (shellPolicy?.mode?.forcedValue) {
    nextConfig.mode = shellPolicy.mode.forcedValue;
  }

  if (shellPolicy?.duplexPreset?.forcedValue) {
    nextConfig.duplexPreset = shellPolicy.duplexPreset.forcedValue;
  } else if (shellPolicy?.duplexPreset?.hidden) {
    nextConfig.duplexPreset = "normal";
  }

  return nextConfig;
}

export default function PdfExportShellModal({
  isOpen,
  title,
  slotPairs,
  shellPolicy,
  placeholderLookup,
  summaryContent,
  onCancel,
  onStateChange,
  buildExportRun,
  buildAlignmentExportRun,
  topContent,
  children,
}: PdfExportShellModalProps) {
  const { t, language } = useI18n();
  const { settings: exportSettings } = useExportSettingsState();
  const pdfSettings = exportSettings.pdf ?? DEFAULT_PDF_PRINT_CONFIG;
  const baseDefaultConfig = useMemo(
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
  const defaultConfig = useMemo(
    () => applyShellPolicyToConfig(baseDefaultConfig, shellPolicy),
    [baseDefaultConfig, shellPolicy],
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
  const [pdfRenderTarget, setPdfRenderTarget] = useState<Awaited<
    ReturnType<typeof apiClient.getCard>
  > | null>(null);
  const cancelRequestedRef = useRef(false);
  const pdfPreviewRef = useRef<CardPreviewHandle | null>(null);

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
    setPdfRenderTarget(null);
    cancelRequestedRef.current = false;
  }, [defaultBleedOptions, defaultConfig, isOpen]);

  const effectiveConfig = useMemo(
    () => applyShellPolicyToConfig(layoutMode === "custom" ? config : defaultConfig, shellPolicy),
    [config, defaultConfig, layoutMode, shellPolicy],
  );
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
    if (!isOpen) return;
    onStateChange?.(shellState);
  }, [isOpen, onStateChange, shellState]);

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
  const hasExportableContent = slotPairs.length > 0;
  const isAlignmentExportVisible = !shellPolicy?.alignmentExportHidden;

  const closeProgress = useCallback(() => {
    setIsProgressOpen(false);
    setProgressCurrent(0);
    setProgressTotal(0);
    setProgressPhase(null);
    setIsCancelling(false);
    cancelRequestedRef.current = false;
  }, []);

  const buildExecutableNormalRun = useCallback(
    async (buildRun: PdfExportShellModalProps["buildExportRun"]): Promise<ExecutablePdfExportRun | null> => {
      const configForRun = {
        ...shellState.effectiveConfig,
        bleedMm: shellState.resolvedBleedOptions.bleedMm,
      };
      const layout = computeLayoutPlan(configForRun, {
        imagePaddingMm: shellState.resolvedBleedOptions.imagePaddingMm,
        reservedBottomMm: getPdfFooterReserveMm(),
      });
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return null;
      }

      const builtRun = await buildRun({
        shellState,
        config: configForRun,
        layout,
      });
      if (!builtRun) return null;

      const composition = composePrintComposition(slotPairs, layout.grid.perPage);
      if (!composition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return null;
      }

      const cachedPngByFaceId = new Map<string, Uint8Array>();
      const renderFacePngBytes = async (faceId: string): Promise<Uint8Array | null> => {
        if (cachedPngByFaceId.has(faceId)) {
          return cachedPngByFaceId.get(faceId) ?? null;
        }

        const placeholder = placeholderLookup?.[faceId];
        if (placeholder) {
          const bytes = await renderPdfPlaceholderFacePngBytes({
            spec: placeholder,
            configForRun,
            shellState,
          });
          if (bytes) cachedPngByFaceId.set(faceId, bytes);
          return bytes;
        }

        const card = await apiClient.getCard({ params: { id: faceId } }).catch(() => null);
        if (!card) {
          return null;
        }

        const bytes = await renderPdfCardFacePngBytes({
          card,
          previewRef: pdfPreviewRef,
          setRenderTarget: setPdfRenderTarget,
          configForRun,
          shellState,
        });
        if (bytes) cachedPngByFaceId.set(faceId, bytes);
        return bytes;
      };

      return {
        ...builtRun,
        config: configForRun,
        layout,
        composition,
        renderFacePngBytes,
      };
    },
    [placeholderLookup, shellState, slotPairs, t],
  );

  const buildExecutableAlignmentRun = useCallback(
    async (
      buildRun: NonNullable<PdfExportShellModalProps["buildAlignmentExportRun"]>,
    ): Promise<ExecutablePdfExportRun | null> => {
      const configForRun = {
        ...shellState.effectiveConfig,
        bleedMm: shellState.resolvedBleedOptions.bleedMm,
      };
      const layout = computeLayoutPlan(configForRun, {
        imagePaddingMm: shellState.resolvedBleedOptions.imagePaddingMm,
        reservedBottomMm: getPdfFooterReserveMm(),
      });
      if (layout.grid.perPage <= 0) {
        window.alert(t("decks.pdf.errors.layoutCapacity"));
        return null;
      }

      const builtRun = await buildRun({
        shellState,
        config: configForRun,
        layout,
      });
      if (!builtRun) return null;
      if (!builtRun.composition.sheets.length) {
        window.alert(t("decks.pdf.errors.noSheets"));
        return null;
      }

      return {
        ...builtRun,
        config: configForRun,
        layout,
      };
    },
    [shellState, t],
  );

  const executeRun = useCallback(
    async (run: ExecutablePdfExportRun) => {
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
    [closeProgress, t],
  );

  const resolvedTopContent =
    typeof topContent === "function" ? topContent(shellState) : topContent;
  const hasSummaryContent = Boolean(
    summaryContent &&
      (summaryContent.columns.some((column) => column.length > 0) || summaryContent.notice),
  );

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
                {isAlignmentExportVisible ? (
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    disabled={!hasExportableContent || isExporting || !buildAlignmentExportRun}
                    onClick={() => {
                      if (!buildAlignmentExportRun) return;
                      void buildExecutableAlignmentRun(buildAlignmentExportRun).then((run) => {
                        if (!run) return;
                        void executeRun(run);
                      });
                    }}
                  >
                    {exportAlignmentTestLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!hasExportableContent || isExporting}
                  onClick={() => {
                    void buildExecutableNormalRun(buildExportRun).then((run) => {
                      if (!run) return;
                      void executeRun(run);
                    });
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
            {hasSummaryContent ? (
              <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryBody}`}>
                <div className={styles.deckPdfSummaryGrid}>
                  {summaryContent?.columns.map((column, columnIndex) => (
                    <div key={columnIndex} className={styles.deckPdfSummaryNotes}>
                      {column.map((line, lineIndex) => (
                        <div
                          key={`${columnIndex}-${lineIndex}-${line.text}`}
                          className={
                            line.tone === "muted"
                              ? styles.deckPdfSummaryLineMuted
                              : styles.deckPdfSummaryLine
                          }
                        >
                          {line.text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {summaryContent?.notice ? (
                  <div
                    className={
                      summaryContent.notice.tone === "blocked"
                        ? styles.deckPdfSummaryBlocked
                        : summaryContent.notice.tone === "muted"
                          ? styles.deckPdfSummaryLineMuted
                          : styles.deckPdfSummaryLine
                    }
                  >
                    {summaryContent.notice.text}
                  </div>
                ) : null}
              </div>
            ) : null}
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
              {showLayoutForm ? (
                <PdfExportConfigForm
                  config={config}
                  hiddenFields={{
                    mode: shellPolicy?.mode?.hidden,
                    duplexPreset: shellPolicy?.duplexPreset?.hidden,
                  }}
                  onChange={setConfig}
                />
              ) : null}
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
      {pdfRenderTarget ? (
        <div
          style={{ position: "fixed", left: -99999, top: -99999, pointerEvents: "none" }}
          aria-hidden="true"
        >
          <CardPreview
            ref={pdfPreviewRef}
            templateId={pdfRenderTarget.templateId}
            templateName={getTemplateNameLabel(
              language,
              cardTemplatesById[pdfRenderTarget.templateId],
            )}
            backgroundSrc={cardTemplatesById[pdfRenderTarget.templateId]?.background}
            cardData={cardRecordToCardData(pdfRenderTarget as never)}
            copyrightTextColor={pdfRenderTarget.copyrightColor ?? undefined}
          />
        </div>
      ) : null}
    </>
  );
}
