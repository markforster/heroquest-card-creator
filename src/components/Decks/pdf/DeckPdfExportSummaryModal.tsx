"use client";

import styles from "@/app/page.module.css";
import ActionBar from "@/components/common/ActionBar";
import CardThumbnail from "@/components/common/CardThumbnail";
import ModalShell from "@/components/common/ModalShell";
import { resolveDeckPdfExportSummary, type DeckPdfExcludedSet } from "@/components/Decks/deck-export";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import type { PrintConfig } from "@/lib/pdf-export";

type DeckPdfExportSummaryModalProps = {
  isOpen: boolean;
  isExporting: boolean;
  summary: Awaited<ReturnType<typeof resolveDeckPdfExportSummary>> | null;
  config: PrintConfig;
  onCancel: () => void;
  onAdjustSettings: () => void;
  onExport: () => void;
  onExportAlignmentTest: () => void;
};

function ExcludedSetThumb({ set }: { set: DeckPdfExcludedSet }) {
  const url = useCardThumbnailUrl(set.backFaceId, null, { enabled: Boolean(set.backFaceId), useCache: true });
  return (
    <div className={styles.deckPdfExcludedItem}>
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
    </div>
  );
}

export default function DeckPdfExportSummaryModal({
  isOpen,
  isExporting,
  summary,
  config,
  onCancel,
  onAdjustSettings,
  onExport,
  onExportAlignmentTest,
}: DeckPdfExportSummaryModalProps) {
  const { t } = useI18n();
  const hasIncludedSets = Boolean(summary && summary.includedSetCount > 0);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onCancel}
      title={t("decks.pdf.modal.title")}
      contentClassName={`${styles.settingsPopover} ${styles.confirmPopover}`}
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
                onClick={onAdjustSettings}
                disabled={isExporting}
              >
                {t("actions.settings")}
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
        <div className={styles.deckPdfSummaryBody}>
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
          {summary.excludedSetCount > 0 ? (
            <>
              <div className={styles.deckPdfSummaryExcludedHeading}>
                {summary.excludedSetCount} empty sets will not be exported:
              </div>
              <div className={styles.deckPdfExcludedRow}>
                {summary.excludedSets.map((set) => (
                  <ExcludedSetThumb key={set.setId} set={set} />
                ))}
              </div>
            </>
          ) : null}
          {!hasIncludedSets ? (
            <div className={styles.deckPdfSummaryBlocked}>
              No sets with entries are available for PDF export.
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.deckPdfSummaryLineMuted}>{t("ui.loading")}</div>
      )}
    </ModalShell>
  );
}

