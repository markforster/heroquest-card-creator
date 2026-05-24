"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import CardThumbnail from "@/components/common/CardThumbnail";
import ModalShell from "@/components/common/ModalShell";
import type {
  DeckPdfExportSummary,
  DeckPdfSetMeta,
  DeckPdfSetScopeMode,
} from "@/components/Decks/deck-export";
import ExportOptionsForm, { type ExportOptionsFormState } from "@/components/Export/ExportOptionsForm";
import PdfExportConfigForm from "@/components/Export/PdfExportConfigForm";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import type { PrintConfig } from "@/lib/pdf-export";

type DeckPdfExportSummaryModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  summary: DeckPdfExportSummary | null;
  config: PrintConfig;
  bleedOptions: ExportOptionsFormState;
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
  isSelected,
  showSelection,
  onToggle,
}: {
  set: DeckPdfSetMeta;
  isSelected: boolean;
  showSelection: boolean;
  onToggle: () => void;
}) {
  const url = useCardThumbnailUrl(set.backFaceId, null, { enabled: Boolean(set.backFaceId), useCache: true });
  return (
    <button
      type="button"
      className={styles.deckPdfSetItem}
      data-selected={showSelection ? String(isSelected) : undefined}
      onClick={showSelection ? onToggle : undefined}
      disabled={!showSelection}
    >
      <CardThumbnail
        src={url}
        alt=""
        variant="xs"
        fit="contain"
        className={styles.deckPdfExcludedThumb}
        fallback={<div className={styles.deckPdfExcludedThumbFallback} />}
      />
      <div className={styles.deckPdfExcludedTitle} title={set.setTitle}>
        {set.setTitle}
      </div>
      <div className={styles.deckPdfSummaryLineMuted}>{set.hasEntries ? "has entries" : "empty"}</div>
    </button>
  );
}

export default function DeckPdfExportSummaryModal({
  isOpen,
  isExporting,
  summary,
  config,
  bleedOptions,
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
  const hasIncludedSets = Boolean(summary && summary.totalEntryQuantity > 0);
  const showScopeForm = setScopeMode !== "complete";
  const showLayoutForm = layoutMode !== "default";
  const showBleedForm = bleedMode !== "default";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("decks.pdf.modal.title")}
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
            <div className={styles.settingsGroup}>
              <label className={styles.deckPdfSummaryLine}>
                Set scope
                <select
                  className="form-select form-select-sm mt-1"
                  value={setScopeMode}
                  onChange={(event) => onSetScopeMode(event.target.value as DeckPdfSetScopeMode)}
                >
                  <option value="complete">Complete sets</option>
                  <option value="all">All sets</option>
                  <option value="selected">Selected sets</option>
                </select>
              </label>
            </div>
            {showScopeForm ? (
              <div className={styles.settingsGroup}>
                <div className={styles.deckPdfSummaryExcludedHeading}>Set selection</div>
                <div className={styles.deckPdfExcludedRow}>
                  {summary.sets.map((set) => (
                    <SetThumb
                      key={set.setId}
                      set={set}
                      showSelection={setScopeMode === "selected"}
                      isSelected={setScopeMode === "selected" ? selectedSetIds.has(set.setId) : set.hasEntries}
                      onToggle={() => onToggleSet(set.setId)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className={styles.settingsGroup}>
              <label className={styles.deckPdfSummaryLine}>
                Layout
                <select
                  className="form-select form-select-sm mt-1"
                  value={layoutMode}
                  onChange={(event) => onLayoutMode(event.target.value as "default" | "custom")}
                >
                  <option value="default">Default</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
            </div>
            {showLayoutForm ? (
              <div className={styles.settingsGroup}>
                <PdfExportConfigForm config={config} onChange={onConfigChange} />
              </div>
            ) : null}
            <div className={styles.settingsGroup}>
              <label className={styles.deckPdfSummaryLine}>
                Bleed settings
                <select
                  className="form-select form-select-sm mt-1"
                  value={bleedMode}
                  onChange={(event) => onBleedMode(event.target.value as "default" | "custom")}
                >
                  <option value="default">Default</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
            </div>
            {showBleedForm ? (
              <div className={styles.settingsGroup}>
                <ExportOptionsForm
                  {...bleedOptions}
                  bleedLabelKey="label.exportWithBleed"
                  headingLabelKey="heading.exportSettings"
                  onChange={onBleedOptionsChange}
                  useSettingsGroup
                />
              </div>
            ) : null}
            <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryBody}`}>
              <div className={styles.deckPdfSummaryLine}>
                <strong>{summary.includedSetCount}</strong> sets with entries will be exported.
              </div>
              <div className={styles.deckPdfSummaryLine}>
                <strong>{summary.totalEntryQuantity}</strong> total entry quantity.
              </div>
              <div className={styles.deckPdfSummaryLine}>
                Faces: <strong>{summary.frontFaceCount}</strong> front, <strong>{summary.backFaceCount}</strong> back,{" "}
                <strong>{summary.totalFaceCount}</strong> total.
              </div>
              <div className={styles.deckPdfSummaryLineMuted}>
                Run settings: {config.paper}, {config.orientation}, {config.mode === "frontAndBack" ? "front + back" : "fronts only"}
              </div>
              {summary.emptyExcludedSetCount > 0 ? (
                <div className={styles.deckPdfSummaryLineMuted}>
                  {summary.emptyExcludedSetCount} empty sets are excluded by current scope.
                </div>
              ) : null}
            </div>
            {!hasIncludedSets ? (
              <div className={styles.deckPdfSummaryBlocked}>
                No sets with entries are available for PDF export.
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
