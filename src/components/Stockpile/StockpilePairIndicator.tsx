"use client";

import styles from "@/app/page.module.css";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { resolveStockpileThumb } from "@/components/Stockpile/stockpile-thumbs";

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

  const pairedThumb = card.paired.back
    ? resolveStockpileThumb(card.paired.back.id, card.paired.back.thumbnailBlob ?? null)
    : { url: null as string | null, onLoad: undefined as (() => void) | undefined };
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
            const stackThumb = resolveStockpileThumb(paired.id, paired.thumbnailBlob ?? null);
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
}
