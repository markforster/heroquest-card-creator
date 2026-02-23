"use client";

import { AlertTriangle } from "lucide-react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";

type StockpileCardsGridProps = {
  items: StockpileCardView[];
  actions: StockpileCardActions;
  isPairMode: boolean;
  conflictPopoverCardId: string | null;
};

const resolveThumbUrl = (blob: Blob | null) => {
  if (typeof window === "undefined" || !blob) return null;
  return URL.createObjectURL(blob);
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
        const thumbUrl = resolveThumbUrl(card.thumbnailBlob);
        const pairedThumbUrl = resolveThumbUrl(card.paired.back?.thumbnailBlob ?? null);
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
                      {pairedThumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pairedThumbUrl}
                          alt=""
                          onLoad={() => {
                            URL.revokeObjectURL(pairedThumbUrl);
                          }}
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
                        const stackThumbUrl = resolveThumbUrl(paired.thumbnailBlob ?? null);
                        const stackTemplateThumb = paired.templateThumbSrc ?? null;
                        return (
                          <div
                            key={paired.id}
                            className={styles.cardsPairStackItem}
                            style={{ zIndex: index + 1 }}
                          >
                            <div className={styles.cardsPairIndicatorInner}>
                              {stackThumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={stackThumbUrl}
                                  alt=""
                                  onLoad={() => {
                                    URL.revokeObjectURL(stackThumbUrl);
                                  }}
                                />
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
                      {pairedThumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pairedThumbUrl}
                          alt=""
                          onLoad={() => {
                            URL.revokeObjectURL(pairedThumbUrl);
                          }}
                        />
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
              onLoad={
                thumbUrl
                  ? () => {
                      URL.revokeObjectURL(thumbUrl);
                    }
                  : undefined
              }
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
