"use client";

import styles from "@/app/page.module.css";
import StockpileThumbImage from "@/components/Stockpile/StockpileThumbImage";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";

export type StockpilePairIndicatorProps = {
  card: StockpileCardView;
  actions: StockpileCardActions;
  isPairMode?: boolean;
  variant?: "grid" | "table";
  className?: string;
};

export default function StockpilePairIndicator({
  card,
  actions,
  isPairMode = false,
  className,
}: StockpilePairIndicatorProps) {
  if (isPairMode) return null;

  const pairedTemplateThumb = card.paired.back?.templateThumbSrc ?? null;
  const visiblePairedFronts = card.paired.frontsVisible;
  const pairedFrontsOverflow = card.paired.frontsOverflow;

  return (
    <div
      className={`${styles.cardsPairIndicator} ${className ?? ""}`.trim()}
      onMouseEnter={(event) => {
        actions.onPairHoverEnter(card.id, event.currentTarget.getBoundingClientRect());
      }}
      onMouseLeave={() => actions.onPairHoverLeave(card.id)}
    >
      {card.effectiveFace === "back" ? (
        <div className={styles.cardsPairStack}>
          {visiblePairedFronts.map((paired, index) => {
            const stackTemplateThumb = paired.templateThumbSrc ?? null;
            return (
              <div
                key={paired.id}
                className={styles.cardsPairStackItem}
                style={{ zIndex: index + 1 }}
              >
                <div className={styles.cardsPairIndicatorInner}>
                  <StockpileThumbImage
                    cardId={paired.id}
                    thumbnailBlob={paired.thumbnailBlob ?? null}
                    templateThumbSrc={stackTemplateThumb}
                    alt=""
                    fallback={<div className={styles.cardsPairIndicatorPlaceholder} />}
                  />
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
      )}
    </div>
  );
}
