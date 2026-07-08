"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import FormSelect from "@/components/common/FormSelect";
import CardThumbnail from "@/components/common/CardThumbnail";
import type {
  DeckPdfExportSummary,
  DeckPdfSetMeta,
  DeckPdfSetScopeMode,
} from "@/components/Decks/deck-export";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

type DeckPdfExportPanelProps = {
  isOpen: boolean;
  summary: DeckPdfExportSummary | null;
  setScopeMode: DeckPdfSetScopeMode;
  selectedSetIds: Set<string>;
  onSetScopeMode: (mode: DeckPdfSetScopeMode) => void;
  onToggleSet: (setId: string) => void;
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

export default function DeckPdfExportPanel({
  isOpen,
  summary,
  setScopeMode,
  selectedSetIds,
  onSetScopeMode,
  onToggleSet,
}: DeckPdfExportPanelProps) {
  const { t } = useI18n();
  const [hideEmptySets, setHideEmptySets] = useState(false);

  const showHideEmptyFilter =
    setScopeMode !== "all" && Boolean(summary?.sets.some((set) => set.entryCount === 0));
  const scopeHelpText =
    setScopeMode === "all"
      ? t("decks.pdf.summary.selection.help.all" as never)
      : setScopeMode === "selected"
        ? t("decks.pdf.summary.selection.help.selected" as never)
        : t("decks.pdf.summary.selection.help.complete" as never);
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

  useEffect(() => {
    if (isOpen) setHideEmptySets(false);
  }, [isOpen]);

  if (!summary) {
    return <div className={styles.deckPdfSummaryLineMuted}>{t("ui.loading")}</div>;
  }

  return (
    <>
      <div className={`${styles.settingsGroup} ${styles.deckPdfSummaryControlGroup}`}>
        <label className={styles.deckPdfSummaryInlineControl}>
          <span className={styles.deckPdfSummaryInlineLabel}>
            {t("decks.pdf.summary.scope.label" as never)}
          </span>
          <FormSelect
            className={styles.deckPdfSummaryFormSelect}
            value={setScopeMode}
            options={[
              { value: "complete", label: t("decks.pdf.summary.scope.complete" as never) },
              { value: "all", label: t("decks.pdf.summary.scope.all" as never) },
              { value: "selected", label: t("decks.pdf.summary.scope.selected" as never) },
            ]}
            onChange={(next) => onSetScopeMode(next as DeckPdfSetScopeMode)}
          />
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
    </>
  );
}
