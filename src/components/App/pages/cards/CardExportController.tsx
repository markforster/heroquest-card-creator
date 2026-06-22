"use client";

import { useMemo, useRef, useState } from "react";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import CardPreview, { type CardPreviewHandle } from "@/components/Cards/CardPreview";
import CardThumbnail from "@/components/common/CardThumbnail";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import ExportBleedPrompt, { type ExportPromptResult } from "@/components/Modals/ExportBleedPrompt";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { buildAppHashUrl } from "@/lib/browser";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { buildMissingAssetsReport, type MissingAssetReport } from "@/lib/export-assets-cache";
import { exportFaceIdsToZip } from "@/lib/export-face-ids";
import type { CardFace } from "@/types/card-face";

type UseCardExportControllerArgs = {
  activeCardId?: string;
  effectiveFace: CardFace | null;
  pairedBackId: string | null;
  pairedFrontCount: number;
  pairedFrontIds: string[];
  activeFrontId: string | null;
  previewRef: React.RefObject<CardPreviewHandle>;
};

export function useCardExportController({
  activeCardId,
  effectiveFace,
  pairedBackId,
  pairedFrontCount,
  pairedFrontIds,
  activeFrontId,
  previewRef,
}: UseCardExportControllerArgs) {
  const { t, language } = useI18n();
  const { track } = useAnalytics();
  const { settings: exportSettings } = useExportSettingsState();

  const exportPreviewRef = useRef<CardPreviewHandle>(null!);
  const exportCancelRef = useRef(false);
  const exportPromptRef = useRef<number | null>(null);
  const exportSecondaryModeRef = useRef<"worker" | "fallback" | null>(null);

  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExportingFaces, setIsExportingFaces] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSecondaryPercent, setExportSecondaryPercent] = useState<number | null>(null);
  const [exportSecondaryMode, setExportSecondaryMode] = useState<"worker" | "fallback" | null>(
    null,
  );
  const [exportCancelled, setExportCancelled] = useState(false);
  const [exportPrompt, setExportPrompt] = useState<{
    resolve: (result: ExportPromptResult | null) => void;
    initial: typeof exportSettings;
    token: number;
  } | null>(null);
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<{
    report: MissingAssetReport[];
    skipIds: Set<string>;
    skipNotes: Map<string, string>;
    onProceed: () => void;
  } | null>(null);

  const exportMenuItems = useMemo(() => {
    if (!effectiveFace) return [];
    if (effectiveFace === "front") {
      if (!pairedBackId) return [];
      return [{ id: "export-both-faces", label: t("label.exportBothFaces") }];
    }
    if (effectiveFace === "back") {
      if (pairedFrontCount <= 0) return [];
      if (pairedFrontCount === 1) {
        return [{ id: "export-both-faces", label: t("label.exportBothFaces") }];
      }
      return [
        { id: "export-back-active-front", label: t("label.exportFaceAndActiveFront") },
        { id: "export-back-all-fronts", label: t("label.exportFaceAndAllFronts") },
      ];
    }
    return [];
  }, [effectiveFace, pairedBackId, pairedFrontCount, t]);

  const requestExportOptions = async (): Promise<ExportPromptResult | null> => {
    const settings = exportSettings;
    const resolveFromSettings = (): ExportPromptResult => ({
      bleedPx: settings.bleed.enabled ? settings.bleed.bleedPx : 0,
      cropMarks: {
        enabled: settings.bleed.enabled ? settings.cropMarks.enabled : false,
        color: settings.cropMarks.color,
        style: settings.cropMarks.style ?? "lines",
      },
      cutMarks: {
        enabled: settings.cutMarks.enabled,
        color: settings.cutMarks.color,
      },
      roundedCorners: settings.roundedCorners,
    });
    if (!settings.bleed.askBeforeExport) {
      return resolveFromSettings();
    }

    return new Promise<ExportPromptResult | null>((resolve) => {
      const token = Date.now() + Math.random();
      exportPromptRef.current = token;
      setExportPrompt({ resolve, initial: settings, token });
      let resolved = false;
      const safeResolve = (result: ExportPromptResult) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };
      window.setTimeout(() => {
        if (exportPromptRef.current !== token) {
          setExportPrompt(null);
          safeResolve(resolveFromSettings());
        }
      }, 0);
    });
  };

  const openCardInNewTab = (cardIdToOpen: string) => {
    if (typeof window === "undefined") return;
    const url = buildAppHashUrl(`/cards/${cardIdToOpen}`);
    window.open(url, "_blank", "noopener");
  };

  const buildSkipNotesFromReport = (report: MissingAssetReport[]) => {
    const notes = new Map<string, string>();
    report.forEach((entry) => {
      const missingSummary = entry.missing
        .map((asset) => `${asset.label} asset \"${asset.name}\" (id=${asset.id})`)
        .join(", ");
      notes.set(
        entry.cardId,
        `Card \"${entry.title}\" (id=${entry.cardId}, template=${entry.templateId}, face=${entry.face}) could not be exported because the ${missingSummary}.`,
      );
    });
    return notes;
  };

  const exportCurrentFace = (exportOptions?: ExportPromptResult | unknown) => {
    const resolvedOptions = isExportPromptResult(exportOptions) ? exportOptions : undefined;
    void (async () => {
      const resolved = resolvedOptions ?? (await requestExportOptions());
      if (!resolved) return;

      if (!activeCardId) {
        previewRef.current?.exportAsPng(resolved);
        return;
      }

      try {
        const card = await apiClient.getCard({ params: { id: activeCardId } });
        if (!card) {
          previewRef.current?.exportAsPng(resolved);
          return;
        }
        if (ENABLE_MISSING_ASSET_CHECKS) {
          const report = await buildMissingAssetsReport([card]);
          if (report.length > 0) {
            setMissingAssetsPrompt({
              report,
              skipIds: new Set(report.map((entry) => entry.cardId)),
              skipNotes: buildSkipNotesFromReport(report),
              onProceed: () => {
                previewRef.current?.exportAsPng(resolved);
              },
            });
            return;
          }
        }
        previewRef.current?.exportAsPng(resolved);
      } catch {
        previewRef.current?.exportAsPng(resolved);
      }
    })();
  };

  const exportFaceIds = async (
    faceIds: string[],
    options?: {
      skipIds?: Set<string>;
      skipNotes?: Map<string, string>;
      skipPrecheck?: boolean;
      exportOptions?: ExportPromptResult;
    },
  ) => {
    const resolvedExportOptions = options?.exportOptions ?? (await requestExportOptions());
    if (!resolvedExportOptions) return;

    if (faceIds.length <= 1) {
      exportCurrentFace(resolvedExportOptions);
      return;
    }

    if (ENABLE_MISSING_ASSET_CHECKS && !options?.skipPrecheck) {
      const records = await Promise.all(
        faceIds.map(async (id) => {
          try {
            return await apiClient.getCard({ params: { id } });
          } catch {
            return null;
          }
        }),
      );
      const cards = records.filter((record): record is CardRecord => Boolean(record));
      const report = await buildMissingAssetsReport(cards);
      if (report.length > 0) {
        const skipIds = new Set(report.map((entry) => entry.cardId));
        const skipNotes = buildSkipNotesFromReport(report);
        setMissingAssetsPrompt({
          report,
          skipIds,
          skipNotes,
          onProceed: () => {
            void exportFaceIds(faceIds, { skipIds, skipNotes, skipPrecheck: true });
          },
        });
        return;
      }
    }

    try {
      setIsExportingFaces(true);
      const skipIds = options?.skipIds;
      const total = skipIds ? faceIds.filter((id) => !skipIds.has(id)).length : faceIds.length;
      setExportTotal(total);
      setExportProgress(0);
      setExportSecondaryPercent(null);
      setExportSecondaryMode(null);
      exportSecondaryModeRef.current = null;
      setExportCancelled(false);
      exportCancelRef.current = false;
      const result = await exportFaceIdsToZip(faceIds, {
        previewRef: exportPreviewRef,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (count) => setExportProgress(count),
        onZipProgress: (percent) => {
          if (exportSecondaryModeRef.current === "fallback") return;
          setExportSecondaryPercent(percent);
        },
        onZipStatus: (mode) => {
          setExportSecondaryMode(mode);
          exportSecondaryModeRef.current = mode;
          if (mode === "fallback") {
            setExportSecondaryPercent(null);
          }
        },
        shouldCancel: () => exportCancelRef.current,
        skipCardIds: options?.skipIds,
        skipCardNotes: options?.skipNotes,
        bleedPx: resolvedExportOptions.bleedPx,
        cropMarks: resolvedExportOptions.cropMarks,
        cutMarks: resolvedExportOptions.cutMarks,
        roundedCorners: resolvedExportOptions.roundedCorners,
      });
      if (result.status === "empty") {
        window.alert(t("alert.selectCardToExport"));
      } else if (result.status === "no-images") {
        window.alert(t("alert.noImagesExported"));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[card-export] Failed to export faces", error);
      window.alert(t("alert.exportImagesFailed"));
    } finally {
      setIsExportingFaces(false);
      setExportTarget(null);
      setExportTotal(0);
      setExportProgress(0);
      setExportSecondaryPercent(null);
      setExportSecondaryMode(null);
      exportSecondaryModeRef.current = null;
      setExportCancelled(false);
    }
  };

  const handleExportBothFaces = async () => {
    if (!activeCardId) {
      exportCurrentFace();
      return;
    }
    if (effectiveFace === "front") {
      if (!pairedBackId) {
        exportCurrentFace();
        return;
      }
      await exportFaceIds([activeCardId, pairedBackId]);
      return;
    }
    if (effectiveFace === "back") {
      const pairedId = pairedFrontIds[0];
      if (!pairedId) {
        exportCurrentFace();
        return;
      }
      await exportFaceIds([activeCardId, pairedId]);
    }
  };

  const handleExportBackActiveFront = async () => {
    if (!activeCardId || !activeFrontId) {
      exportCurrentFace();
      return;
    }
    await exportFaceIds([activeCardId, activeFrontId]);
  };

  const handleExportBackAllFronts = async () => {
    if (!activeCardId || pairedFrontIds.length === 0) {
      exportCurrentFace();
      return;
    }
    await exportFaceIds([activeCardId, ...pairedFrontIds]);
  };

  const exportTemplate = exportTarget ? cardTemplatesById[exportTarget.templateId] : null;
  const exportTemplateName =
    exportTemplate && exportTarget ? getTemplateNameLabel(language, exportTemplate) : "";
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget) : undefined;

  const onExportPng = () => {
    track("export_started", { scope: "editor_single" });
    exportCurrentFace();
  };

  const resolvedExportMenuItems = exportMenuItems.map((item) => ({
    ...item,
    onClick: () => {
      track("export_started", { scope: "editor_multi" });
      if (item.id === "export-both-faces") {
        void handleExportBothFaces();
      } else if (item.id === "export-back-active-front") {
        void handleExportBackActiveFront();
      } else if (item.id === "export-back-all-fronts") {
        void handleExportBackAllFronts();
      }
    },
  }));

  const exportUi = (
    <>
      {exportTemplate && exportTarget ? (
        <div className={styles.bulkExportPreview} aria-hidden="true">
          <CardPreview
            ref={exportPreviewRef}
            templateId={exportTemplate.id}
            templateName={exportTemplateName}
            backgroundSrc={exportTemplate.background}
            cardData={exportCardData}
          />
        </div>
      ) : null}
      {missingAssetsPrompt ? (
        <ConfirmModal
          isOpen={Boolean(missingAssetsPrompt)}
          title={t("warning.missingAssetsTitle")}
          confirmLabel={t("actions.proceedExport")}
          cancelLabel={t("actions.cancel")}
          contentClassName={styles.missingAssetsModal}
          onConfirm={() => {
            const prompt = missingAssetsPrompt;
            if (!prompt) return;
            setMissingAssetsPrompt(null);
            prompt.onProceed();
          }}
          onCancel={() => {
            setMissingAssetsPrompt(null);
          }}
        >
          <div>{t("warning.missingAssetsBody")}</div>
          <div className={styles.assetsReportStatus}>{t("label.opensInNewTab")}</div>
          <div className={styles.assetsReportList}>
            {missingAssetsPrompt.report.map((entry) => {
              const thumbUrl = entry.thumbnailBlob ? URL.createObjectURL(entry.thumbnailBlob) : null;
              const fallbackUrl = cardTemplatesById[entry.templateId]?.thumbnail?.src ?? null;
              return (
                <div key={entry.cardId} className={styles.assetsReportItem}>
                  <div className="d-flex align-items-center gap-3">
                    <CardThumbnail
                      src={thumbUrl ?? fallbackUrl}
                      alt={entry.title}
                      variant="sm"
                      onLoad={() => {
                        if (thumbUrl) {
                          URL.revokeObjectURL(thumbUrl);
                        }
                      }}
                    />
                    <div className={styles.assetsReportName}>
                      {entry.title} ({entry.templateId})
                    </div>
                  </div>
                  <div className={styles.assetsReportStatus}>
                    {t("label.missingAssets")}:{" "}
                    {entry.missing.map((asset) => `${asset.label} \"${asset.name}\"`).join(", ")}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm mt-2"
                    onClick={() => openCardInNewTab(entry.cardId)}
                  >
                    {t("actions.openCardNewTab")}
                  </button>
                </div>
              );
            })}
          </div>
        </ConfirmModal>
      ) : null}
      {exportPrompt ? (
        <ExportBleedPrompt
          isOpen={Boolean(exportPrompt)}
          initialBleedEnabled={exportPrompt.initial.bleed.enabled}
          initialBleedPx={exportPrompt.initial.bleed.bleedPx}
          initialCropMarksEnabled={exportPrompt.initial.cropMarks.enabled}
          initialCropMarkColor={exportPrompt.initial.cropMarks.color}
          initialCropMarkStyle={exportPrompt.initial.cropMarks.style ?? "lines"}
          initialCutMarksEnabled={exportPrompt.initial.cutMarks.enabled}
          initialCutMarkColor={exportPrompt.initial.cutMarks.color}
          initialRoundedCorners={exportPrompt.initial.roundedCorners}
          onConfirm={(result) => {
            const prompt = exportPrompt;
            if (!prompt) return;
            setExportPrompt(null);
            prompt.resolve(result);
          }}
          onCancel={() => {
            const prompt = exportPrompt;
            if (!prompt) return;
            setExportPrompt(null);
            prompt.resolve(null);
          }}
        />
      ) : null}
      <ExportProgressOverlay
        isOpen={isExportingFaces}
        title={`${t("status.exportingImages")} (${exportTotal})`}
        progress={exportProgress}
        total={exportTotal}
        secondaryLabel={exportSecondaryMode ? t("status.finalizing") : null}
        secondaryPercent={exportSecondaryMode === "worker" ? exportSecondaryPercent : null}
        exportCancelled={exportCancelled}
        onCancel={() => {
          exportCancelRef.current = true;
          setExportCancelled(true);
        }}
      />
    </>
  );

  return {
    exportMenuItems: resolvedExportMenuItems,
    exportUi,
    onExportPng,
  };
}

function isExportPromptResult(value: unknown): value is ExportPromptResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ExportPromptResult>;
  if (typeof candidate.bleedPx !== "number") return false;
  const crop = candidate.cropMarks;
  if (!crop || typeof crop !== "object") return false;
  if (typeof crop.enabled !== "boolean") return false;
  if (typeof crop.color !== "string") return false;
  if (crop.style && crop.style !== "lines" && crop.style !== "squares") return false;
  const cut = candidate.cutMarks;
  if (!cut || typeof cut !== "object") return false;
  if (typeof cut.enabled !== "boolean") return false;
  if (typeof cut.color !== "string") return false;
  if (typeof candidate.roundedCorners !== "boolean") return false;
  return true;
}
