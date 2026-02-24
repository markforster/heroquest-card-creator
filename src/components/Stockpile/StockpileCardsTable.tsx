"use client";

import { BringToFront, SendToBack } from "lucide-react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";

type StockpileCardsTableProps = {
  items: StockpileCardView[];
  actions: StockpileCardActions;
  headers: {
    card: string;
    name: string;
    type: string;
    face: string;
    modified: string;
    pairing: string;
  };
};

const resolveThumbUrl = (blob: Blob | null) => {
  if (typeof window === "undefined" || !blob) return null;
  return URL.createObjectURL(blob);
};

export default function StockpileCardsTable({
  items,
  actions,
  headers,
}: StockpileCardsTableProps) {
  return (
    <div className={styles.stockpileTable} role="table">
      <div className={styles.stockpileTableHeader} role="row">
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.card}
        </div>
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.name}
        </div>
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.type}
        </div>
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.face}
        </div>
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.modified}
        </div>
        <div className={styles.stockpileTableCell} role="columnheader">
          {headers.pairing}
        </div>
      </div>
      <div className={styles.stockpileTableBody} role="rowgroup">
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
              className={`${styles.stockpileTableRow} ${
                card.isSelected ? styles.stockpileTableRowSelected : ""
              }`}
              role="row"
              onClick={(event) =>
                actions.onCardClick(card.id, event, false, card.isPairingConflict)
              }
              onDoubleClick={() => actions.onCardDoubleClick(card.id)}
            >
              <div
                className={styles.stockpileTableCell}
                role="cell"
                onMouseEnter={(event) => {
                  actions.onTableThumbEnter(card.id, event.currentTarget.getBoundingClientRect());
                }}
                onMouseLeave={() => actions.onTableThumbLeave(card.id)}
              >
                <CardThumbnail
                  src={thumbUrl}
                  alt={card.name}
                  variant="sm"
                  fit="contain"
                  onLoad={
                    thumbUrl
                      ? () => {
                          URL.revokeObjectURL(thumbUrl);
                        }
                      : undefined
                  }
                />
              </div>
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTableName}`}
                role="cell"
                title={card.name}
              >
                {card.name}
              </div>
              <div className={styles.stockpileTableCell} role="cell">
                <span
                  className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
                >
                  {card.templateLabel}
                </span>
              </div>
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTableValue}`}
                role="cell"
              >
                <span className={`${styles.inspectorFaceButton} ${styles.stockpileFacePill}`}>
                  {card.effectiveFace === "back" ? (
                    <SendToBack size={16} className={styles.inspectorFaceItemIcon} />
                  ) : (
                    <BringToFront size={16} className={styles.inspectorFaceItemIcon} />
                  )}
                  <span>{card.facePillLabel}</span>
                </span>
              </div>
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTableValue}`}
                role="cell"
              >
                {card.updatedLabel} {card.timeLabel}
              </div>
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTablePairing}`}
                role="cell"
              >
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
