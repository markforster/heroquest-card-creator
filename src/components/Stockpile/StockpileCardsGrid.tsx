"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";

import styles from "@/app/page.module.css";
import RemoteCardThumbnail from "@/components/common/CardThumbnail/RemoteCardThumbnail";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import StockpilePairIndicator from "@/components/Stockpile/StockpilePairIndicator";
import StockpileSelectCheckbox from "@/components/Stockpile/StockpileSelectCheckbox";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";

const ENABLE_GRID_VARIANT = false;

type StockpileCardsGridProps = {
  items: StockpileCardView[];
  actions: StockpileCardActions;
  isPairMode: boolean;
  conflictPopoverCardId: string | null;
  dragEnabled: boolean;
  onClearSelection: () => void;
};

type StockpileCardsGridItemProps = {
  card: StockpileCardView;
  actions: StockpileCardActions;
  isPairMode: boolean;
  conflictPopoverCardId: string | null;
  dragEnabled: boolean;
};

function StockpileCardsGridItem({
  card,
  actions,
  isPairMode,
  conflictPopoverCardId,
  dragEnabled,
}: StockpileCardsGridItemProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !dragEnabled,
  });
  const selectLabel = formatMessage(t("aria.selectCard"), { name: card.name });
  const pairedTemplateThumb = card.paired.back?.templateThumbSrc ?? null;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.assetsItem} ${
        card.isSelected
          ? card.isPairingConflict
            ? styles.assetsItemConflict
            : styles.assetsItemSelected
          : ""
      } ${isDragging ? styles.stockpileCardDragging : ""}`}
      aria-label={card.name}
      onMouseEnter={() => {
        if (!card.isPairingConflict || !card.isSelected) return;
        actions.onConflictHoverEnter(card.id);
      }}
      onMouseLeave={() => {
        if (!card.isPairingConflict || !card.isSelected) return;
        actions.onConflictHoverLeave(card.id);
      }}
      onClick={(event) =>
        actions.onCardClick(card.id, event, isPairMode, card.isPairingConflict)
      }
      onDoubleClick={() => {
        if (isPairMode) return;
        actions.onCardDoubleClick(card.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          actions.onCardSelectSingle(card.id);
          return;
        }
        if (event.key === " ") {
          event.preventDefault();
          actions.onCardSetSelected(
            card.id,
            !card.isSelected,
            isPairMode,
            card.isPairingConflict,
          );
        }
      }}
      {...attributes}
      {...listeners}
    >
      {card.isPairingConflict ? (
        <div className={styles.cardsConflictIndicator}>
          <AlertTriangle className={styles.cardsConflictIcon} aria-hidden="true" />
        </div>
      ) : null}
      {conflictPopoverCardId === card.id ? (
        <div className={styles.cardsConflictOverlay}>
          <div className={styles.cardsConflictPopover}>
            <div className={styles.cardsConflictPopoverContent}>
              <div className={styles.cardsConflictPopoverThumb}>
                {card.paired.back ? (
                  <StockpileThumbImage
                    cardId={card.paired.back.id}
                    thumbnailBlob={card.paired.back.thumbnailBlob ?? null}
                    templateThumbSrc={pairedTemplateThumb}
                    alt=""
                    fallback={<div className={styles.cardsPairIndicatorPlaceholder} />}
                  />
                ) : pairedTemplateThumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pairedTemplateThumb} alt="" />
                ) : (
                  <div className={styles.cardsPairIndicatorPlaceholder} />
                )}
              </div>
              <div className={styles.cardsConflictPopoverText}>
                {card.conflictLabel}
                <span>{card.conflictPairedName}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {ENABLE_GRID_VARIANT ? (
        <div className={styles.stockpileGridVariant}>
          {isPairMode ? null : (
            <div className={styles.stockpileGridRowHeader}>
              <div className={styles.cardsItemName} title={card.name}>
                {card.name}
              </div>
              <StockpileSelectCheckbox
                card={card}
                actions={actions}
                isPairMode={isPairMode}
                label={selectLabel}
              />
            </div>
          )}
          <div className={styles.stockpileGridRowBody}>
            <div className={styles.stockpileGridColumnThumb}>
              <RemoteCardThumbnail
                cardId={card.id}
                thumbnailBlob={card.thumbnailBlob}
                templateThumbSrc={card.templateThumbSrc ?? null}
                alt={card.name}
                variant="md"
                fit="contain"
              />
            </div>
            {isPairMode ? null : (
              <div className={styles.stockpileGridColumnMeta}>
              <div
                className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]} ${
                  styles.stockpileGridTypeVertical
                }`}
              >
                {card.templateLabel}
              </div>
                <StockpilePairIndicator
                  card={card}
                  actions={actions}
                  isPairMode={isPairMode}
                  variant="grid"
                />
              </div>
            )}
          </div>
          {isPairMode ? null : (
            <div className={styles.stockpileGridRowFooter}>
              <div className={styles.cardsItemDetails}>
                {card.updatedLabel} {card.timeLabel}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {isPairMode ? null : (
            <div className={styles.cardsItemHeader}>
              <div className={styles.stockpileCardTitleRow}>
                <StockpileSelectCheckbox
                  card={card}
                  actions={actions}
                  isPairMode={isPairMode}
                  label={selectLabel}
                />
                <div className={styles.cardsItemName} title={card.name}>
                  {card.name}
                </div>
              </div>
              <StockpilePairIndicator
                card={card}
                actions={actions}
                isPairMode={isPairMode}
                variant="grid"
              />
            </div>
          )}
          <RemoteCardThumbnail
            cardId={card.id}
            thumbnailBlob={card.thumbnailBlob}
            templateThumbSrc={card.templateThumbSrc ?? null}
            alt={card.name}
            variant="md"
            fit="contain"
          />
          {isPairMode ? null : (
            <div className={styles.cardsItemMeta}>
              <div
                className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
              >
                {card.templateLabel}
              </div>
              <div className={styles.cardsItemDetails}>
                {card.updatedLabel} {card.timeLabel}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StockpileCardsGrid({
  items,
  actions,
  isPairMode,
  conflictPopoverCardId,
  dragEnabled,
  onClearSelection,
}: StockpileCardsGridProps) {
  return (
    <div
      className={styles.assetsGrid}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClearSelection();
      }}
    >
      {items.map((card) => (
        <StockpileCardsGridItem
          key={card.id}
          card={card}
          actions={actions}
          isPairMode={isPairMode}
          conflictPopoverCardId={conflictPopoverCardId}
          dragEnabled={dragEnabled}
        />
      ))}
    </div>
  );
}
