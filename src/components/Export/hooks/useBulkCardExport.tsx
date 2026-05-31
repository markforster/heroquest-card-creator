"use client";

import { useMemo, useRef, useState } from "react";

import CardPreview from "@/components/Cards/CardPreview";
import type { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import ExportBleedPrompt, { type ExportPromptResult } from "@/components/Modals/ExportBleedPrompt";
import { useExportSettingsState } from "@/components/Providers/ExportSettingsContext";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { buildMissingAssetsReport, type MissingAssetReport } from "@/lib/export-assets-cache";
import { runBulkExport, type BulkExportResult } from "@/lib/export-cards";
import type { ExportSettings } from "@/lib/export-settings";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import type { CardRecord } from "@/types/cards-db";

export type MissingAssetsExportPrompt = {
  cards: CardRecord[];
  report: MissingAssetReport[];
  skipIds: Set<string>;
  skipNotes: Map<string, string>;
};

export type StartBulkCardExportOptions = {
  cards: CardRecord[];
  skipIds?: Set<string>;
  skipNotes?: Map<string, string>;
  skipPrecheck?: boolean;
  resolveName: (card: CardRecord, usedNames: Map<string, number>) => string;
  resolveZipName: () => string;
};

export type StartBulkCardExportResult =
  | { status: "completed"; result: BulkExportResult }
  | { status: "cancelled" }
  | { status: "missing-assets"; prompt: MissingAssetsExportPrompt };

function buildSkipNotesFromReport(report: MissingAssetReport[]): Map<string, string> {
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
}

export function useBulkCardExport() {
  const { t, language } = useI18n();
  const { settings: exportSettings } = useExportSettingsState();

  const previewRef = useRef<CardPreviewHandle | null>(null);
  const cancelExportRef = useRef(false);

  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportSecondaryPercent, setExportSecondaryPercent] = useState<number | null>(null);
  const [exportSecondaryMode, setExportSecondaryMode] = useState<"worker" | "fallback" | null>(
    null,
  );
  const [exportCancelled, setExportCancelled] = useState(false);
  const exportSecondaryModeRef = useRef<"worker" | "fallback" | null>(null);

  const [exportPrompt, setExportPrompt] = useState<{
    resolve: (result: ExportPromptResult | null) => void;
    initial: ExportSettings;
  } | null>(null);

  const requestExportOptions = async (): Promise<ExportPromptResult | null> => {
    const settings = exportSettings;
    if (!settings.bleed.askBeforeExport) {
      return {
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
      };
    }
    return new Promise<ExportPromptResult | null>((resolve) => {
      setExportPrompt({ resolve, initial: settings });
    });
  };

  const startBulkCardExport = async (
    options: StartBulkCardExportOptions,
  ): Promise<StartBulkCardExportResult> => {
    const { cards, resolveName, resolveZipName } = options;
    if (!cards.length) {
      window.alert(t("alert.selectCardToExport"));
      return { status: "cancelled" };
    }

    const skipIds = options.skipIds ?? new Set<string>();
    const skipNotes = options.skipNotes ?? new Map<string, string>();

    if (ENABLE_MISSING_ASSET_CHECKS && !options.skipPrecheck) {
      const report = await buildMissingAssetsReport(cards);
      if (report.length > 0) {
        return {
          status: "missing-assets",
          prompt: {
            cards,
            report,
            skipIds: new Set(report.map((entry) => entry.cardId)),
            skipNotes: buildSkipNotesFromReport(report),
          },
        };
      }
    }

    const exportOptions = await requestExportOptions();
    if (!exportOptions) {
      return { status: "cancelled" };
    }

    const exportableCount = cards.filter((card) => !skipIds.has(card.id)).length;
    setIsExporting(true);
    setExportTotal(exportableCount);
    setExportProgress(0);
    setExportSecondaryPercent(null);
    setExportSecondaryMode(null);
    exportSecondaryModeRef.current = null;
    setExportCancelled(false);
    cancelExportRef.current = false;

    try {
      const result = await runBulkExport({
        cards,
        previewRef,
        resolveName,
        resolveZipName,
        shouldCancel: () => cancelExportRef.current,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (exportedCount) => setExportProgress(exportedCount),
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
        skipCardIds: skipIds,
        skipCardNotes: skipNotes,
        bleedPx: exportOptions.bleedPx,
        cropMarks: exportOptions.cropMarks,
        cutMarks: exportOptions.cutMarks,
        roundedCorners: exportOptions.roundedCorners,
      });

      if (result.status === "no-images") {
        window.alert(t("alert.noImagesExported"));
      }
      return { status: "completed", result };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[export] Bulk export failed", error);
      window.alert(t("alert.exportImagesFailed"));
      return { status: "cancelled" };
    } finally {
      setIsExporting(false);
      setExportTarget(null);
      setExportTotal(0);
      setExportProgress(0);
      setExportSecondaryPercent(null);
      setExportSecondaryMode(null);
      exportSecondaryModeRef.current = null;
      setExportCancelled(false);
      cancelExportRef.current = false;
    }
  };

  const exportTemplate = exportTarget ? cardTemplatesById[exportTarget.templateId] : null;
  const exportTemplateName =
    exportTemplate && exportTarget ? getTemplateNameLabel(language, exportTemplate) : "";
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget as never) : undefined;

  const exportUi = useMemo(
    () => (
      <>
        {exportTemplate && exportTarget ? (
          <div style={{ position: "fixed", left: -99999, top: -99999, pointerEvents: "none" }} aria-hidden="true">
            <CardPreview
              ref={previewRef}
              templateId={exportTemplate.id}
              templateName={exportTemplateName}
              backgroundSrc={exportTemplate.background}
              cardData={exportCardData}
              copyrightTextColor={exportCardData?.copyrightColor}
            />
          </div>
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
          isOpen={isExporting}
          title={`${t("status.exportingImages")} (${exportTotal})`}
          progress={exportProgress}
          total={exportTotal}
          secondaryLabel={exportSecondaryMode ? t("status.finalizing") : null}
          secondaryPercent={exportSecondaryMode === "worker" ? exportSecondaryPercent : null}
          exportCancelled={exportCancelled}
          onCancel={() => {
            cancelExportRef.current = true;
            setExportCancelled(true);
          }}
        />
      </>
    ),
    [
      exportTemplate,
      exportTarget,
      exportTemplateName,
      exportCardData,
      exportPrompt,
      isExporting,
      exportTotal,
      exportProgress,
      exportSecondaryMode,
      exportSecondaryPercent,
      exportCancelled,
      t,
    ],
  );

  return {
    startBulkCardExport,
    exportUi,
    isExporting,
  };
}
