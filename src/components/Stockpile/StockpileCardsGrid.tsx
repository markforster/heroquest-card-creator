"use client";

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

type StockpileCardsGridProps = {
  items: StockpileCardView[];
  actions: StockpileCardActions;
  isPairMode: boolean;
  conflictPopoverCardId: string | null;
};

const resolveThumb = (id: string, blob: Blob | null) => {
  if (typeof window === "undefined") return { url: null as string | null, onLoad: undefined as (() => void) | undefined };
  if (ENABLE_CARD_THUMB_CACHE) {
    return { url: getCachedCardThumbnailUrl(id, blob), onLoad: undefined };
  }
  const url = getLegacyCardThumbnailUrl(id, blob ?? null);
  return {
    url,
    onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined,
  };
};

export default function StockpileCardsGrid({
  items,
  actions,
  isPairMode,
  conflictPopoverCardId,
}: StockpileCardsGridProps) {
  return (
    <div className={styles.assetsGrid}>
      {items.map((card) => {
        const { url: thumbUrl, onLoad: thumbOnLoad } = resolveThumb(
          card.id,
          card.thumbnailBlob,
        );
        const pairedThumb = card.paired.back
          ? resolveThumb(card.paired.back.id, card.paired.back.thumbnailBlob ?? null)
          : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
        const pairedTemplateThumb = card.paired.back?.templateThumbSrc ?? null;
        const visiblePairedFronts = card.paired.frontsVisible;
        const pairedFrontsOverflow = card.paired.frontsOverflow;

        return (
          <button
            key={card.id}
            type="button"
            className={`${styles.assetsItem} ${
              card.isSelected
                ? card.isPairingConflict
                  ? styles.assetsItemConflict
                  : styles.assetsItemSelected
                : ""
            }`}
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
            {isPairMode ? null : (
              <div className={styles.cardsItemHeader}>
                <div className={styles.cardsItemName} title={card.name}>
                  {card.name}
                </div>
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
                        const stackThumb = resolveThumb(
                          paired.id,
                          paired.thumbnailBlob ?? null,
                        );
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
                          <div className={styles.cardsPairStackOverflow}>
                            +{pairedFrontsOverflow}
                          </div>
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
          </button>
        );
      })}
    </div>
  );
}
