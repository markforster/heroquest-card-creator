"use client";

import { useRef, useState } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import {
  invalidateCardThumbnail,
  useCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/api/cards";

import type { RecentCardGroup } from "./useRecentCards";

type RecentCardsListProps = {
  cards: RecentCardGroup[];
  onSelectCard: (card: CardRecord) => boolean | void;
  onClose: () => void;
};

type RecentCardItemProps = {
  card: CardRecord;
  retryToken: number;
  onSelectCard: (card: CardRecord) => boolean | void;
  onClose: () => void;
  onThumbError: (cardId: string) => void;
};

function RecentCardItem({
  card,
  retryToken,
  onSelectCard,
  onClose,
  onThumbError,
}: RecentCardItemProps) {
  const templateThumb = cardTemplatesById[card.templateId]?.thumbnail ?? null;
  const thumbUrl = useCardThumbnailUrl(card.id, card.thumbnailBlob ?? null, {
    enabled: true,
    useCache: ENABLE_CARD_THUMB_CACHE,
  });

  return (
    <button
      key={card.id}
      type="button"
      className={`${styles.cardsItem} ${styles.recentCardsItem}`}
      onClick={() => {
        const shouldClose = onSelectCard(card);
        if (shouldClose !== false) {
          onClose();
        }
      }}
    >
      <div className={styles.cardsItemHeader}>
        <div className={`${styles.cardsItemName} ${styles.recentCardsItemName}`} title={card.name}>
          {card.name}
        </div>
      </div>
      <CardThumbnail
        key={`${card.id}-${retryToken}`}
        src={thumbUrl ?? templateThumb?.src ?? null}
        alt={card.name}
        variant="fluidSm"
        fit="contain"
        onError={() => onThumbError(card.id)}
      />
    </button>
  );
}

export default function RecentCardsList({
  cards,
  onSelectCard,
  onClose,
}: RecentCardsListProps) {
  const { t } = useI18n();
  const [retryToken, setRetryToken] = useState(0);
  const retriedRef = useRef<Set<string>>(new Set());
  const handleThumbError = (cardId: string) => {
    if (!ENABLE_CARD_THUMB_CACHE) return;
    if (retriedRef.current.has(cardId)) return;
    retriedRef.current.add(cardId);
    invalidateCardThumbnail(cardId);
    setRetryToken((prev) => prev + 1);
  };

  return (
    <div className={styles.recentCardsSections}>
      {cards.map((group) =>
        group.cards.length ? (
          <section key={group.id} className={styles.recentCardsSection}>
            <h3 className={styles.recentCardsSectionTitle}>{t(group.labelKey)}</h3>
            <div className={`${styles.cardsGrid} ${styles.recentCardsGrid}`}>
              {group.cards.map((card) => {
                return (
                  <RecentCardItem
                    key={card.id}
                    card={card}
                    retryToken={retryToken}
                    onSelectCard={onSelectCard}
                    onClose={onClose}
                    onThumbError={handleThumbError}
                  />
                );
              })}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
