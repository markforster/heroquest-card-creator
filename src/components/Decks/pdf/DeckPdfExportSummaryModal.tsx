"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import CardThumbnail from "@/components/common/CardThumbnail";
import ModalShell from "@/components/common/ModalShell";
import type {
  DeckPdfExportSummary,
  DeckPdfSetMeta,
  DeckPdfSetScopeMode,
} from "@/components/Decks/deck-export";
import {
  formatDeckPdfBleedSummary,
  formatDeckPdfLayoutSummary,
} from "@/components/Decks/pdf/deckPdfSummaryText";
import ExportOptionsForm, {
  type ExportOptionsFormState,
} from "@/components/Export/ExportOptionsForm";
import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import type { PrintConfig } from "@/lib/pdf-export";

type DeckPdfExportSummaryModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  summary: DeckPdfExportSummary | null;
  config: PrintConfig;
  defaultConfig: PrintConfig;
  bleedOptions: ExportOptionsFormState;
  defaultBleedOptions: ExportOptionsFormState;
  setScopeMode: DeckPdfSetScopeMode;
  layoutMode: "default" | "custom";
  bleedMode: "default" | "custom";
  selectedSetIds: Set<string>;
  onCancel: () => void;
  onSetScopeMode: (mode: DeckPdfSetScopeMode) => void;
  onLayoutMode: (mode: "default" | "custom") => void;
  onBleedMode: (mode: "default" | "custom") => void;
  onToggleSet: (setId: string) => void;
  onConfigChange: (next: PrintConfig) => void;
  onBleedOptionsChange: (next: Partial<ExportOptionsFormState>) => void;
  onExport: () => void;
  onExportAlignmentTest: () => void;
};

function SetThumb({
  set,
  isIncluded,
  isInteractive,
  isDisabled,
  onToggle,
  t,
}: {
  set: DeckPdfSetMeta;
  isIncluded: boolean;
  isInteractive: boolean;
  isDisabled: boolean;
  onToggle: () => void;
  t: (key: never, options?: Record<string, unknown>) => string;
}) {
  const url = useCardThumbnailUrl(set.backFaceId, null, {
    enabled: Boolean(set.backFaceId),
    useCache: true,
  });
  const entryCountLabel =
    set.entryCount === 1
      ? t("decks.pdf.summary.entryCount.one" as never, { count: set.entryCount })
      : t("decks.pdf.summary.entryCount.other" as never, { count: set.entryCount });
  return (
    <button
      type="button"
      className={styles.deckPdfSetItem}
      title={set.setTitle}
      aria-label={set.setTitle}
      data-included={String(isIncluded)}
      data-interactive={String(isInteractive)}
      data-disabled={String(isDisabled)}
      onClick={isInteractive ? onToggle : undefined}
      disabled={isDisabled}
    >
      <CardThumbnail
        src={url}
        alt=""
        variant="smMd"
        fit="contain"
        className={styles.deckPdfExcludedThumb}
        fallback={<div className={styles.deckPdfExcludedThumbFallback} />}
      />
      <div
        className={
          set.entryCount === 0
            ? `${styles.deckPdfSummaryLineMuted} ${styles.deckPdfEntryCountZero}`
            : styles.deckPdfSummaryLineMuted
        }
      >
        {entryCountLabel}
      </div>
    </button>
  );
}

export default function DeckPdfExportSummaryModal({
  isOpen,
  isExporting,
  summary,
  config,
  defaultConfig,
  bleedOptions,
  defaultBleedOptions,
  setScopeMode,
  layoutMode,
  bleedMode,
  selectedSetIds,
  onCancel,
  onSetScopeMode,
  onLayoutMode,
  onBleedMode,
  onToggleSet,
  onConfigChange,
  onBleedOptionsChange,
  onExport,
  onExportAlignmentTest,
}: DeckPdfExportSummaryModalProps) {
  const { t } = useI18n();
  const [hideEmptySets, setHideEmptySets] = useState(false);
  const hasIncludedSets = Boolean(summary && summary.exportSlotQuantity > 0);
  const showLayoutForm = layoutMode !== "default";
  const showBleedForm = bleedMode !== "default";
  const effectiveLayoutConfig = layoutMode === "custom" ? config : defaultConfig;
  const effectiveBleedOptions = bleedMode === "custom" ? bleedOptions : defaultBleedOptions;
  const showHideEmptyFilter =
    setScopeMode !== "all" && Boolean(summary?.sets.some((set) => set.entryCount === 0));
  const scopeHelpText =
    setScopeMode === "all"
      ? t("decks.pdf.summary.selection.help.all" as never)
      : setScopeMode === "selected"
        ? t("decks.pdf.summary.selection.help.selected" as never)
        : t("decks.pdf.summary.selection.help.complete" as never);
  const scopeIncludedLabelKey =
    setScopeMode === "all"
      ? "decks.pdf.summary.includedSets.all"
      : setScopeMode === "selected"
        ? "decks.pdf.summary.includedSets.selected"
        : "decks.pdf.summary.includedSets.complete";
  const filteredSets = summary
    ? summary.sets.filter((set) => {
        if (!hideEmptySets) return true;
        if (setScopeMode === "selected") return selectedSetIds.has(set.setId);
        if (!showHideEmptyFilter || set.entryCount > 0) return true;
        if (setScopeMode === "complete") return false;
        if (setScopeMode === "all") return false;
        return true;
      })
    : [];
  const hiddenSetCount = summary ? summary.sets.length - filteredSets.length : 0;
  const hideEmptyLabelKey =
    setScopeMode === "selected"
      ? "decks.pdf.summary.hideUnselected"
      : "decks.pdf.summary.hideEmpty";
  const hideEmptyLabel = hideEmptySets
    ? t(`${hideEmptyLabelKey}.hidden` as never, { count: hiddenSetCount })
    : t(`${hideEmptyLabelKey}.label` as never);
  const layoutSummary = formatDeckPdfLayoutSummary(effectiveLayoutConfig, t);
  const bleedSummary = formatDeckPdfBleedSummary(effectiveBleedOptions, t);

  useEffect(() => {
    if (isOpen) setHideEmptySets(false);
  }, [isOpen]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("decks.pdf.modal.title") + " (Beta)"}
      contentClassName={styles.settingsPopover}
      footer={
        <ActionBar
          right={
            <>
              <button type="button" className="btn btn-outline-light btn-sm" onClick={onCancel}>
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                disabled={!hasIncludedSets || isExporting}
                onClick={onExportAlignmentTest}
              >
                {t("decks.pdf.modal.exportAlignmentTest")}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!hasIncludedSets || isExporting}
                onClick={onExport}
              >
                {isExporting ? t("actions.exporting") : t("decks.pdf.modal.export")}
              </button>
            </>
          }
        />
      }
    >
      {summary ? (
        <div className={styles.settingsPanelScroll}>
          <div className={styles.settingsPanelBody}>
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
              <label className={styles.deckPdfSummaryInlineControl}>
                <span className={styles.deckPdfSummaryInlineLabel}>
                  {t("decks.pdf.summary.scope.label" as never)}
                </span>
                <select
                  className="form-select form-select-sm"
                  value={setScopeMode}
                  onChange={(event) => onSetScopeMode(event.target.value as DeckPdfSetScopeMode)}
                >
                  <option value="complete">{t("decks.pdf.summary.scope.complete" as never)}</option>
                  <option value="all">{t("decks.pdf.summary.scope.all" as never)}</option>
                  <option value="selected">{t("decks.pdf.summary.scope.selected" as never)}</option>
                </select>
              </label>
              <div className={styles.deckPdfTrayFrame}>
                <div className={styles.deckPdfExcludedRow}>
                  {filteredSets.map((set) => {
                    const isInteractive = setScopeMode === "selected";
                    const isIncluded =
                      setScopeMode === "all"
                        ? true
                        : setScopeMode === "selected"
                          ? selectedSetIds.has(set.setId)
                          : set.hasEntries;
                    const isDisabled = setScopeMode === "complete" && !set.hasEntries;
                    return (
                      <SetThumb
                        key={set.setId}
                        set={set}
                        t={t}
                        isIncluded={isIncluded}
                        isInteractive={isInteractive}
                        isDisabled={isDisabled}
                        onToggle={() => onToggleSet(set.setId)}
                      />
                    );
                  })}
                </div>
              </div>
              <div className={styles.deckPdfTrayFooter}>
                <div className={`form-text ${styles.deckPdfTrayHelpText}`}>{scopeHelpText}</div>
                {showHideEmptyFilter ? (
                  <div className={`form-check ${styles.deckPdfTrayFilter}`}>
                    <label
                      className={`form-check-label ${styles.deckPdfTrayFilterLabel}`}
                      htmlFor="deck-pdf-hide-empty-sets"
                    >
                      {hideEmptyLabel}
                    </label>
                    <input
                      id="deck-pdf-hide-empty-sets"
                      className="form-check-input"
                      type="checkbox"
                      checked={hideEmptySets}
                      onChange={(event) => setHideEmptySets(event.target.checked)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
              <div className={styles.deckPdfSummaryInlineControl}>
                <div className={styles.deckPdfSummaryInlineHeader}>
                  <span className={styles.deckPdfSummaryInlineLabel}>
                    {t("decks.pdf.summary.layout.label" as never)}:
                  </span>
                  <span className={styles.deckPdfSummaryInlineSummary}>{layoutSummary}</span>
                </div>
                <div className={`form-check form-switch m-0 ${styles.deckPdfSummaryToggle}`}>
                  <span className={`form-check-label ${styles.deckPdfSummaryToggleLabel}`}>
                    {t("decks.pdf.summary.layout.customize" as never)}
                  </span>
                  <input
                    type="checkbox"
                    className="form-check-input hq-toggle"
                    checked={layoutMode === "custom"}
                    onChange={(event) =>
                      onLayoutMode(event.target.checked ? "custom" : "default")
                    }
                    aria-label={t("decks.pdf.summary.layout.customize" as never)}
                  />
                </div>
              </div>
              {showLayoutForm ? (
                <PdfExportConfigForm config={config} onChange={onConfigChange} />
              ) : null}
            </div>
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
              <div className={styles.deckPdfSummaryInlineControl}>
                <div className={styles.deckPdfSummaryInlineHeader}>
                  <span className={styles.deckPdfSummaryInlineLabel}>
                    {t("decks.pdf.summary.bleedSettings.label" as never)}:
                  </span>
                  <span className={styles.deckPdfSummaryInlineSummary}>{bleedSummary}</span>
                </div>
                <div className={`form-check form-switch m-0 ${styles.deckPdfSummaryToggle}`}>
                  <span className={`form-check-label ${styles.deckPdfSummaryToggleLabel}`}>
                    {t("decks.pdf.summary.bleedSettings.customize" as never)}
                  </span>
                  <input
                    type="checkbox"
                    className="form-check-input hq-toggle"
                    checked={bleedMode === "custom"}
                    onChange={(event) => onBleedMode(event.target.checked ? "custom" : "default")}
                    aria-label={t("decks.pdf.summary.bleedSettings.customize" as never)}
                  />
                </div>
              </div>
              {showBleedForm ? (
                <ExportOptionsForm
                  {...bleedOptions}
                  bleedLabelKey="label.exportWithBleed"
                  headingLabelKey="heading.exportSettings"
                  onChange={onBleedOptionsChange}
                  sectionLayout="columns"
                  useSettingsGroup
                />
              ) : null}
            </div>
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryBody}`}>
              <div className={styles.deckPdfSummaryGrid}>
                <div className={styles.deckPdfSummaryLine}>
                  {t(scopeIncludedLabelKey as never, {
                    count: summary.includedSetCount,
                  })}
                </div>
                <div className={styles.deckPdfSummaryLine}>
                  {t("decks.pdf.summary.totalEntryQuantity" as never, {
                    count: summary.totalEntryQuantity,
                  })}
                </div>
                <div className={styles.deckPdfSummaryLine}>
                  {t("decks.pdf.summary.faces" as never, {
                    frontCount: summary.frontFaceCount,
                    backCount: summary.backFaceCount,
                    totalCount: summary.totalFaceCount,
                  })}
                </div>
              </div>
              <div className={styles.deckPdfSummaryNotes}>
                {summary.includedEmptySetCount > 0 && setScopeMode !== "complete" ? (
                  <div className={styles.deckPdfSummaryLineMuted}>
                    {t("decks.pdf.summary.includedEmptySets" as never, {
                      count: summary.includedEmptySetCount,
                    })}
                  </div>
                ) : null}
                {summary.exportSlotQuantity !== summary.totalEntryQuantity ? (
                  <div className={styles.deckPdfSummaryLineMuted}>
                    {t("decks.pdf.summary.exportSlots" as never, {
                      count: summary.exportSlotQuantity,
                    })}
                  </div>
                ) : null}
                {setScopeMode === "complete" && summary.excludedEmptySetCount > 0 ? (
                  <div className={styles.deckPdfSummaryLineMuted}>
                    {t("decks.pdf.summary.emptyExcluded" as never, {
                      count: summary.excludedEmptySetCount,
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            {!hasIncludedSets ? (
              <div className={styles.deckPdfSummaryBlocked}>
                {t("decks.pdf.summary.noneAvailable" as never)}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.deckPdfSummaryLineMuted}>{t("ui.loading")}</div>
      )}
    </ModalShell>
  );
}
