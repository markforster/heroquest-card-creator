"use client";

import { useDraggable } from "@dnd-kit/core";
import { BringToFront, SendToBack } from "lucide-react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { resolveStockpileThumb } from "@/components/Stockpile/stockpile-thumbs";
import { formatMessage } from "@/components/Stockpile/stockpile-utils";
import StockpilePairIndicator from "@/components/Stockpile/StockpilePairIndicator";
import StockpileSelectCheckbox from "@/components/Stockpile/StockpileSelectCheckbox";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";
import { useI18n } from "@/i18n/I18nProvider";

type StockpileCardsTableProps = {
  items: StockpileCardView[];
  actions: StockpileCardActions;
  dragEnabled: boolean;
  onClearSelection: () => void;
  headers: {
    card: string;
    name: string;
    type: string;
    face: string;
    modified: string;
    pairing: string;
  };
};

type StockpileCardsTableRowProps = {
  card: StockpileCardView;
  actions: StockpileCardActions;
  dragEnabled: boolean;
};

function StockpileCardsTableRow({ card, actions, dragEnabled }: StockpileCardsTableRowProps) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !dragEnabled,
  });
  const { url: thumbUrl, onLoad: thumbOnLoad } = resolveStockpileThumb(
    card.id,
    card.thumbnailBlob,
  );

  return (
    <div
      ref={setNodeRef}
      className={`${styles.stockpileTableRow} ${
        card.isSelected ? styles.stockpileTableRowSelected : ""
      } ${isDragging ? styles.stockpileCardDragging : ""}`}
      onClick={(event) => actions.onCardClick(card.id, event, false, card.isPairingConflict)}
      onDoubleClick={() => actions.onCardDoubleClick(card.id)}
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
      {...attributes}
      {...listeners}
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
      <div className={`${styles.stockpileTableCell} ${styles.stockpileTableValue}`} role="cell">
        <span className={`${styles.inspectorFaceButton} ${styles.stockpileFacePill}`}>
          {card.effectiveFace === "back" ? (
            <SendToBack size={16} className={styles.inspectorFaceItemIcon} />
          ) : (
            <BringToFront size={16} className={styles.inspectorFaceItemIcon} />
          )}
          <span>{card.facePillLabel}</span>
        </span>
      </div>
      <div className={`${styles.stockpileTableCell} ${styles.stockpileTableValue}`} role="cell">
        {card.updatedLabel} {card.timeLabel}
      </div>
      <div className={`${styles.stockpileTableCell} ${styles.stockpileTablePairing}`} role="cell">
        <StockpilePairIndicator card={card} actions={actions} variant="table" />
      </div>
      <div className={`${styles.stockpileTableCell} ${styles.stockpileTableSelectCell}`} role="cell">
        <StockpileSelectCheckbox
          card={card}
          actions={actions}
          isPairMode={false}
          label={formatMessage(t("aria.selectCard"), { name: card.name })}
        />
      </div>
    </div>
  );
}

export default function StockpileCardsTable({
  items,
  actions,
  headers,
  dragEnabled,
  onClearSelection,
}: StockpileCardsTableProps) {
  const { t } = useI18n();
  return (
    <div
      className={styles.stockpileTable}
      role="table"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onClearSelection();
      }}
    >
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
          aria-label={t("aria.selection")}
        />
      </div>
      <div className={styles.stockpileTableBody} role="rowgroup">
        {items.map((card) => (
          <StockpileCardsTableRow
            key={card.id}
            card={card}
            actions={actions}
            dragEnabled={dragEnabled}
          />
        ))}
      </div>
    </div>
  );
}
