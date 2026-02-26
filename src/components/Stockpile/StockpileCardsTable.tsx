"use client";

import { BringToFront, SendToBack } from "lucide-react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";

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
        <div
          className={styles.stockpileTableCell}
          role="columnheader"
          aria-label="Selection"
        />
      </div>
      <div className={styles.stockpileTableBody} role="rowgroup">
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
            <div
              key={card.id}
              className={`${styles.stockpileTableRow} ${
                card.isSelected ? styles.stockpileTableRowSelected : ""
              }`}
              role="row"
              onClick={(event) =>
                actions.onCardClick(card.id, event, false, card.isPairingConflict)
              }
              onDoubleClick={() => actions.onCardDoubleClick(card.id)}
              tabIndex={0}
              aria-label={card.name}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  actions.onCardSelectSingle(card.id);
                  return;
                }
                if (event.key === " ") {
                  event.preventDefault();
                  actions.onCardSetSelected(card.id, !card.isSelected, false, card.isPairingConflict);
                }
              }}
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
                  onLoad={thumbOnLoad}
                />
              </div>
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTableName}`}
                role="cell"
                title={card.name}
              >
                <div className={styles.stockpileTableNameInner}>
                  <span className={styles.stockpileTableNameLabel}>{card.name}</span>
                </div>
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
              <div
                className={`${styles.stockpileTableCell} ${styles.stockpileTableSelectCell}`}
                role="cell"
              >
                <input
                  type="checkbox"
                  className={`form-check-input hq-checkbox ${styles.stockpileCardSelectCheckbox}`}
                  checked={card.isSelected}
                  onChange={(event) => {
                    event.stopPropagation();
                    actions.onCardSetSelected(
                      card.id,
                      event.target.checked,
                      false,
                      card.isPairingConflict,
                    );
                  }}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${card.name}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
