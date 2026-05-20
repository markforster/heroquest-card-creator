"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
  const canDecrement = count > min;
  const canIncrement = count < max;
  const quantityLabel = t("decks.entries.quantity.current").replace("{count}", String(count));

  return (
    <div className={styles.deckEntryQuantityControl} data-entry-qty-control="true">
      <button
        type="button"
        className={`${styles.deckEntryCountButton} ${styles.deckEntryCountButtonMinus}`}
        data-entry-qty-button="true"
        aria-label={t("decks.entries.quantity.decrease")}
        title={t("decks.entries.quantity.decrease")}
        onClick={onDecrement}
        disabled={!canDecrement}
      >
        -
      </button>
      <div
        className={styles.deckEntryCountValue}
        aria-label={quantityLabel}
        title={quantityLabel}
      >
        {count}
      </div>
      <button
        type="button"
        className={`${styles.deckEntryCountButton} ${styles.deckEntryCountButtonPlus}`}
        data-entry-qty-button="true"
        aria-label={t("decks.entries.quantity.increase")}
        title={t("decks.entries.quantity.increase")}
        onClick={onIncrement}
        disabled={!canIncrement}
      >
        +
      </button>
    </div>
  );
}
