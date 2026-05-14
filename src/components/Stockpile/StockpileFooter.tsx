"use client";

import { useEffect, useMemo, useState } from "react";

import { Lightbulb } from "lucide-react";

import styles from "@/app/page.module.css";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/api/cards";
import { previewDeletePair } from "@/lib/pairs-service";
import type { PairUsageReport } from "@/lib/decks-errors";

import type { ReactNode } from "react";

type StockpileFooterProps = {
  isPairMode: boolean;
  isPairFronts: boolean;
  selectedIds: string[];
  activeBackId?: string | null;
  cardById?: Map<string, CardRecord>;
  backByFrontId?: Map<string, string>;
  onConfirmSelection?: (cardIds: string[]) => void;
  onClose: () => void;
  baselineSelectedIds?: string[];
  collectionControls?: ReactNode;
  onBulkExport: () => void;
  canExport: boolean;
  exportLabel: string;
  selectedCard?: CardRecord;
  hasMultiSelection: boolean;
  onLoadSelectedCard: () => void;
};

export default function StockpileFooter({
  isPairMode,
  isPairFronts,
  selectedIds,
  activeBackId,
  cardById,
  onConfirmSelection,
  onClose,
  baselineSelectedIds,
  collectionControls,
  onBulkExport,
  canExport,
  exportLabel,
  selectedCard,
  hasMultiSelection,
  onLoadSelectedCard,
}: StockpileFooterProps) {
  const { t } = useI18n();
  const [hintIndex, setHintIndex] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(true);
  const [isApplyingPairSelection, setIsApplyingPairSelection] = useState(false);
  const [pendingPairFrontsUnpair, setPendingPairFrontsUnpair] = useState<{
    selectedIds: string[];
    removedCards: CardRecord[];
    decks: Array<{
      deckId: string;
      deckTitle: string;
      locations: Array<{ groupId: string; groupTitle: string; setId: string; setTitle: string }>;
    }>;
  } | null>(null);

  const hasSelection = selectedIds.length > 0;
  const hints = useMemo(() => {
    if (hasSelection) {
      return [t("hint.stockpileDragCollection"), t("hint.stockpileExportSelected")];
    }
    return [
      t("hint.stockpileSelect"),
      t("hint.stockpileMultiSelect"),
      t("hint.stockpileOpen"),
    ];
  }, [hasSelection, t]);

  useEffect(() => {
    setHintIndex(0);
    setIsHintVisible(true);
  }, [hints.length, hasSelection]);

  useEffect(() => {
    if (hints.length <= 1) return;
    let cancelled = false;
    let timeoutId: number | null = null;

    const showHint = (index: number) => {
      if (cancelled) return;
      setHintIndex(index);
      setIsHintVisible(true);
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        setIsHintVisible(false);
        timeoutId = window.setTimeout(() => {
          if (cancelled) return;
          const nextIndex = index + 1;
          if (nextIndex < hints.length) {
            showHint(nextIndex);
          } else {
            timeoutId = window.setTimeout(() => {
              showHint(0);
            }, 10_000);
          }
        }, 400);
      }, 8_000);
    };

    showHint(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [hints.length]);

  const buildPairFrontsImpact = async (
    removedFrontIds: string[],
    backFaceId: string,
  ): Promise<{
    decks: Array<{
      deckId: string;
      deckTitle: string;
      locations: Array<{ groupId: string; groupTitle: string; setId: string; setTitle: string }>;
    }>;
  }> => {
    const reports = await Promise.all(
      removedFrontIds.map((frontFaceId) =>
        previewDeletePair(frontFaceId, backFaceId, { mode: "confirmable-cascade" }),
      ),
    );
    const usageByKey = new Map<string, PairUsageReport["cascadePlan"]["usage"][number]>();
    reports.forEach((report) => {
      report.cascadePlan.usage.forEach((usage) => {
        const key = `${usage.deckId}:${usage.groupId}:${usage.setId}`;
        if (!usageByKey.has(key)) usageByKey.set(key, usage);
      });
    });
    const deckMap = new Map<
      string,
      { deckId: string; deckTitle: string; locations: Array<{ groupId: string; groupTitle: string; setId: string; setTitle: string }> }
    >();
    usageByKey.forEach((usage) => {
      const deck = deckMap.get(usage.deckId) ?? {
        deckId: usage.deckId,
        deckTitle: usage.deckTitle,
        locations: [],
      };
      if (!deck.locations.some((location) => location.groupId === usage.groupId && location.setId === usage.setId)) {
        deck.locations.push({
          groupId: usage.groupId,
          groupTitle: usage.groupTitle,
          setId: usage.setId,
          setTitle: usage.setTitle,
        });
      }
      deckMap.set(usage.deckId, deck);
    });
    return { decks: Array.from(deckMap.values()) };
  };

  return (
    <>
      <div className={styles.stockpilePanelFooter}>
        {isPairMode ? (
          <div className="d-flex w-100 justify-content-end gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isApplyingPairSelection}
              onClick={async () => {
                if (!onConfirmSelection) {
                  onClose();
                  return;
                }
                const baseline = baselineSelectedIds ?? [];
                const baselineSet = new Set(baseline);
                const selectedSet = new Set(selectedIds);
                const sameSize = baselineSet.size === selectedSet.size;
                const unchanged =
                  sameSize && Array.from(baselineSet).every((id) => selectedSet.has(id));
                if (isPairFronts && unchanged) {
                  onClose();
                  return;
                }
                if (isPairFronts) {
                  const removedFrontIds = baseline.filter((id) => !selectedSet.has(id));
                  if (removedFrontIds.length === 0) {
                    onConfirmSelection(selectedIds);
                    onClose();
                    return;
                  }
                  if (!activeBackId) {
                    onConfirmSelection(selectedIds);
                    onClose();
                    return;
                  }
                  const removedCards = removedFrontIds
                    .map((id) => cardById?.get(id))
                    .filter((card): card is CardRecord => Boolean(card));
                  setIsApplyingPairSelection(true);
                  try {
                    const impact = await buildPairFrontsImpact(removedFrontIds, activeBackId);
                    setPendingPairFrontsUnpair({
                      selectedIds,
                      removedCards,
                      decks: impact.decks,
                    });
                  } finally {
                    setIsApplyingPairSelection(false);
                  }
                  return;
                }
                onConfirmSelection(selectedIds);
                onClose();
              }}
            >
              {t("actions.confirm")}
            </button>
          </div>
        ) : (
          <div className={`d-flex w-100 align-items-center ${styles.stockpileFooter} ${styles.uRowLg}`}>
            <div className="d-flex flex-shrink-1 flex-grow-0 gap-2">
              {collectionControls ?? null}
            </div>
            <div className={styles.stockpileFooterHints}>
              <div
                className={`${styles.stockpileFooterHint} ${
                  isHintVisible ? styles.stockpileFooterHintVisible : styles.stockpileFooterHintHidden
                }`}
              >
                <Lightbulb className={styles.stockpileFooterHintIcon} aria-hidden="true" />
                <span className={styles.stockpileFooterHintText}>{hints[hintIndex]}</span>
              </div>
            </div>
            <div className="flex-grow-1 flex-shrink-0" />
            <div className="d-flex flex-shrink-1 flex-grow-0 gap-2">
              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={onBulkExport}
                disabled={!canExport}
              >
                {exportLabel}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!selectedCard || hasMultiSelection}
                onClick={onLoadSelectedCard}
              >
                {t("actions.load")}
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingPairFrontsUnpair)}
        title={t("actions.confirm")}
        confirmLabel={t("actions.confirm")}
        cancelLabel={t("actions.cancel")}
        onConfirm={() => {
          const pending = pendingPairFrontsUnpair;
          setPendingPairFrontsUnpair(null);
          if (!pending || !onConfirmSelection) return;
          onConfirmSelection(pending.selectedIds);
          onClose();
        }}
        onCancel={() => setPendingPairFrontsUnpair(null)}
      >
        <div className={styles.pairingUsageList}>
          <div>
            {pendingPairFrontsUnpair
              ? `${pendingPairFrontsUnpair.removedCards.length} card${
                  pendingPairFrontsUnpair.removedCards.length === 1 ? "" : "s"
                } will be unpaired from this back face. Continue?`
              : null}
          </div>
          {pendingPairFrontsUnpair?.removedCards.length ? (
            <>
              <div className={styles.pairFrontsModalSectionTitle}>Cards to be unpaired</div>
              <div className={styles.pairingPanelGrid}>
                {pendingPairFrontsUnpair.removedCards.map((card) => {
                  const templateThumbSrc = cardTemplatesById[card.templateId]?.thumbnail?.src ?? null;
                  return (
                    <div key={card.id} className={styles.pairFrontsModalThumbItem}>
                      <StockpileThumbImage
                        cardId={card.id}
                        thumbnailBlob={card.thumbnailBlob ?? null}
                        templateThumbSrc={templateThumbSrc}
                        alt={card.name || ""}
                        className={styles.pairFrontsModalThumbImage}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          {pendingPairFrontsUnpair?.decks.length ? (
            <>
              <div className={styles.pairFrontsModalSectionTitle}>Impacted decks</div>
              <div className={styles.pairingUsageDecks}>
                {pendingPairFrontsUnpair.decks.map((deck) => (
                  <div
                    key={deck.deckId}
                    className={`${styles.pairingUsageDeckRow} ${styles.pairFrontsDeckRow}`}
                  >
                    <div className={styles.pairFrontsDeckNameRow}>
                      <span className={styles.pairingUsageDeckTitle}>{deck.deckTitle}</span>
                      <DeckFanByDeckId
                        deckId={deck.deckId}
                        variant="xs"
                        maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
                      />
                    </div>
                    <ul className={styles.pairingUsageItems}>
                      {deck.locations.map((location) => (
                        <li key={`${deck.deckId}-${location.groupId}-${location.setId}`}>
                          {`${location.groupTitle} › ${location.setTitle}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </ConfirmModal>
    </>
  );
}
