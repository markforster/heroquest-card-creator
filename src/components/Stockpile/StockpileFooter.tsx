"use client";

import { useMemo, useState } from "react";


import styles from "@/app/page.module.css";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/api/cards";

import type { ReactNode } from "react";

type StockpileFooterProps = {
  isPairMode: boolean;
  isPairFronts: boolean;
  selectedIds: string[];
  activeBackId: string | null;
  cardById: Map<string, CardRecord>;
  backByFrontId: Map<string, string>;
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
  backByFrontId,
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
  const formatMessageWith = useMemo(
    () => (key: string, vars: Record<string, string | number>) =>
      formatMessage(t(key as never), vars),
    [t],
  );
  const [pairingConflict, setPairingConflict] = useState<{
    count: number;
    cardIds: string[];
  } | null>(null);
  const [pairingRemovalPrompt, setPairingRemovalPrompt] = useState<{
    count: number;
  } | null>(null);

  const fallbackTitle = t("label.untitledCard");

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
              disabled={false}
              onClick={() => {
                if (!onConfirmSelection) {
                  onClose();
                  return;
                }
                if (isPairFronts) {
                  const conflicting = selectedIds.filter((id) => {
                    const selectedCard = cardById.get(id);
                    const pairedBackId = selectedCard
                      ? backByFrontId.get(selectedCard.id)
                      : null;
                    if (!pairedBackId) return false;
                    return pairedBackId !== activeBackId;
                  });
                  if (conflicting.length > 0) {
                    setPairingConflict({ count: conflicting.length, cardIds: conflicting });
                    return;
                  }
                }
                const baseline = baselineSelectedIds ?? [];
                const removedCount = baseline.filter((id) => !selectedIds.includes(id)).length;
                if (removedCount > 1) {
                  setPairingRemovalPrompt({ count: removedCount });
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
      {pairingConflict ? (
        <ConfirmModal
          isOpen={Boolean(pairingConflict)}
          title={t("actions.confirm")}
          confirmLabel={t("actions.confirm")}
          cancelLabel={t("actions.cancel")}
          onConfirm={async () => {
            const current = pairingConflict;
            setPairingConflict(null);
            if (!current || !onConfirmSelection) return;
            onConfirmSelection(selectedIds);
            onClose();
          }}
          onCancel={() => {
            setPairingConflict(null);
          }}
        >
          {(() => {
            const backIds = new Set<string>();
            pairingConflict.cardIds.forEach((id) => {
              const card = cardById.get(id);
              const pairedBackId = card ? backByFrontId.get(card.id) : null;
              if (pairedBackId) {
                backIds.add(pairedBackId);
              }
            });
            const backCount = backIds.size || 1;
            return pairingConflict.count === 1
              ? formatMessageWith("warning.pairingLossSingleGeneric", { backCount })
              : formatMessageWith("warning.pairingLossMultipleGeneric", {
                  count: pairingConflict.count,
                  backCount,
                });
          })()}
          {(() => {
            const pairedBackIds = new Set<string>();
            pairingConflict.cardIds.forEach((id) => {
              const card = cardById.get(id);
              const pairedBackId = card ? backByFrontId.get(card.id) : null;
              if (pairedBackId) {
                pairedBackIds.add(pairedBackId);
              }
            });
            const pairedBacks = Array.from(pairedBackIds)
              .map((id) => cardById.get(id))
              .filter((card): card is CardRecord => Boolean(card));
            return (
              <>
                <div className={styles.pairingConflictDivider} />
                <div className={styles.pairingConflictScroll}>
                  <div className={styles.pairingConflictSection}>
                    <div className={styles.pairingConflictTitle}>
                      {t("heading.cardsToBeUnpaired")}
                    </div>
                    <div className={styles.pairingConflictGrid}>
                      {pairingConflict.cardIds.map((id) => {
                        const conflictCard = cardById.get(id);
                        if (!conflictCard) return null;
                        const templateThumb =
                          cardTemplatesById[conflictCard.templateId]?.thumbnail ?? null;
                        return (
                          <div key={id} className={styles.pairingConflictItem}>
                            <StockpileThumbImage
                              cardId={conflictCard.id}
                              thumbnailBlob={conflictCard.thumbnailBlob ?? null}
                              templateThumbSrc={templateThumb?.src ?? null}
                              alt=""
                              fallback={<div className={styles.cardsPairIndicatorPlaceholder} />}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {pairedBacks.length > 0 ? (
                    <div className={styles.pairingConflictSection}>
                      <div className={styles.pairingConflictTitle}>{t("heading.pairedWith")}</div>
                      <div className={styles.pairingConflictGrid}>
                        {pairedBacks.map((paired) => {
                          const templateThumb =
                            cardTemplatesById[paired.templateId]?.thumbnail ?? null;
                          return (
                            <div key={paired.id} className={styles.pairingConflictItem}>
                              <StockpileThumbImage
                                cardId={paired.id}
                                thumbnailBlob={paired.thumbnailBlob ?? null}
                                templateThumbSrc={templateThumb?.src ?? null}
                                alt=""
                                fallback={<div className={styles.cardsPairIndicatorPlaceholder} />}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            );
          })()}
        </ConfirmModal>
      ) : null}
      {pairingRemovalPrompt ? (
        <ConfirmModal
          isOpen={Boolean(pairingRemovalPrompt)}
          title={t("actions.confirm")}
          confirmLabel={t("actions.confirm")}
          cancelLabel={t("actions.cancel")}
          onConfirm={() => {
            const current = pairingRemovalPrompt;
            setPairingRemovalPrompt(null);
            if (!current || !onConfirmSelection) {
              return;
            }
            onConfirmSelection(selectedIds);
            onClose();
          }}
          onCancel={() => {
            setPairingRemovalPrompt(null);
          }}
        >
          {isPairFronts
            ? formatMessageWith("warning.pairingLossMultiple", {
                count: pairingRemovalPrompt.count,
                back: activeBackId ? cardById.get(activeBackId)?.title ?? fallbackTitle : fallbackTitle,
              })
            : formatMessageWith("warning.pairingLossMultipleBacks", {
                backCount: pairingRemovalPrompt.count,
              })}
        </ConfirmModal>
      ) : null}
    </>
  );
}
