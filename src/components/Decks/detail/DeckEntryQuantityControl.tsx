"use client";

import styles from "@/app/page.module.css";

type DeckEntryQuantityControlProps = {
  count: number;
  min?: number;
  max?: number;
  onDecrement: () => void;
  onIncrement: () => void;
};

export default function DeckEntryQuantityControl({
  count,
  min = 1,
  max = 12,
  onDecrement,
  onIncrement,
}: DeckEntryQuantityControlProps) {
  const canDecrement = count > min;
  const canIncrement = count < max;

  return (
    <div className={styles.deckEntryQuantityControl}>
      <button
        type="button"
        className={`${styles.deckEntryCountButton} ${styles.deckEntryCountButtonMinus}`}
        aria-label="Decrease quantity"
        title="Decrease quantity"
        onClick={onDecrement}
        disabled={!canDecrement}
      >
        -
      </button>
      <div
        className={styles.deckEntryCountValue}
        aria-label={`Quantity ${count}`}
        title={`Quantity ${count}`}
      >
        {count}
      </div>
      <button
        type="button"
        className={`${styles.deckEntryCountButton} ${styles.deckEntryCountButtonPlus}`}
        aria-label="Increase quantity"
        title="Increase quantity"
        onClick={onIncrement}
        disabled={!canIncrement}
      >
        +
      </button>
    </div>
  );
}
