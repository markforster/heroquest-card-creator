"use client";

import styles from "@/app/page.module.css";
import type { StockpileCardActions, StockpileCardView } from "@/components/Stockpile/types";

export type StockpileSelectCheckboxProps = {
  card: StockpileCardView;
  actions: StockpileCardActions;
  isPairMode: boolean;
  label: string;
};

export default function StockpileSelectCheckbox({
  card,
  actions,
  isPairMode,
  label,
}: StockpileSelectCheckboxProps) {
  return (
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
      aria-label={label}
    />
  );
}
