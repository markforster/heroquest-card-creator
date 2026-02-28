"use client";

import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";

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

const resolveThumb = (id: string, blob: Blob | null) => {
  if (typeof window === "undefined") {
    return { url: null as string | null, onLoad: undefined as (() => void) | undefined };
  }
  if (ENABLE_CARD_THUMB_CACHE) {
    return { url: getCachedCardThumbnailUrl(id, blob), onLoad: undefined };
  }
  const url = getLegacyCardThumbnailUrl(id, blob ?? null);
  return {
    url,
    onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined,
  };
};

function StockpileCardsGridItem({
  card,
  actions,
  isPairMode,
  conflictPopoverCardId,
  dragEnabled,
}: StockpileCardsGridItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !dragEnabled,
  });
  const { url: thumbUrl, onLoad: thumbOnLoad } = resolveThumb(card.id, card.thumbnailBlob);
  const pairedThumb = card.paired.back
    ? resolveThumb(card.paired.back.id, card.paired.back.thumbnailBlob ?? null)
    : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
  const pairedTemplateThumb = card.paired.back?.templateThumbSrc ?? null;
  const visiblePairedFronts = card.paired.frontsVisible;
  const pairedFrontsOverflow = card.paired.frontsOverflow;
  const pairedIndicator = isPairMode ? null : (
    <div
      className={styles.cardsPairIndicator}
      onMouseEnter={(event) => {
        actions.onPairHoverEnter(card.id, event.currentTarget.getBoundingClientRect());
      }}
      onMouseLeave={() => actions.onPairHoverLeave(card.id)}
    >
      {card.effectiveFace === "back" ? (
        <div className={styles.cardsPairStack}>
          {visiblePairedFronts.map((paired, index) => {
            const stackThumb = resolveThumb(paired.id, paired.thumbnailBlob ?? null);
            const stackTemplateThumb = paired.templateThumbSrc ?? null;
            return (
              <div
                key={paired.id}
                className={styles.cardsPairStackItem}
                style={{ zIndex: index + 1 }}
              >
                <div className={styles.cardsPairIndicatorInner}>
                  {stackThumb.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stackThumb.url} alt="" onLoad={stackThumb.onLoad} />
                  ) : stackTemplateThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stackTemplateThumb} alt="" />
                  ) : (
                    <div className={styles.cardsPairIndicatorPlaceholder} />
                  )}
                </div>
              </div>
            );
          })}
          {pairedFrontsOverflow > 0 ? (
            <div
              className={styles.cardsPairStackItem}
              style={{ zIndex: visiblePairedFronts.length + 1 }}
            >
              <div className={styles.cardsPairStackOverflow}>+{pairedFrontsOverflow}</div>
            </div>
          ) : null}
          {card.paired.fronts.length === 0 ? (
            <div className={styles.cardsPairIndicatorInner}>
              <div className={styles.cardsPairIndicatorPlaceholder} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.cardsPairIndicatorInner}>
          {pairedThumb.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pairedThumb.url} alt="" onLoad={pairedThumb.onLoad} />
          ) : pairedTemplateThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pairedTemplateThumb} alt="" />
          ) : (
            <div className={styles.cardsPairIndicatorPlaceholder} />
          )}
        </div>
      )}
    </div>
  );

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
                {pairedThumb.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pairedThumb.url} alt="" onLoad={pairedThumb.onLoad} />
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
              <input
                type="checkbox"
                className={`form-check-input hq-checkbox ${styles.stockpileCardSelectCheckbox}`}
                checked={card.isSelected}
                onChange={(event) => {
                  event.stopPropagation();
                  actions.onCardSetSelected(
                    card.id,
                    event.target.checked,
                    isPairMode,
                    card.isPairingConflict,
                  );
                }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={`Select ${card.name}`}
              />
            </div>
          )}
          <div className={styles.stockpileGridRowBody}>
            <div className={styles.stockpileGridColumnThumb}>
              <CardThumbnail
                src={thumbUrl}
                alt={card.name}
                variant="md"
                fit="contain"
                onLoad={thumbOnLoad}
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
                {pairedIndicator}
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
                <input
                  type="checkbox"
                  className={`form-check-input hq-checkbox ${styles.stockpileCardSelectCheckbox}`}
                  checked={card.isSelected}
                  onChange={(event) => {
                    event.stopPropagation();
                    actions.onCardSetSelected(
                      card.id,
                      event.target.checked,
                      isPairMode,
                      card.isPairingConflict,
                    );
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label={`Select ${card.name}`}
                />
                <div className={styles.cardsItemName} title={card.name}>
                  {card.name}
                </div>
              </div>
              {pairedIndicator}
            </div>
          )}
          <CardThumbnail
            src={thumbUrl}
            alt={card.name}
            variant="md"
            fit="contain"
            onLoad={thumbOnLoad}
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
