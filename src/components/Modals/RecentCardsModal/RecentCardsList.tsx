"use client";

import { useRef, useState } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  invalidateCardThumbnail,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import type { CardRecord } from "@/types/cards-db";

import type { RecentCardGroup } from "./useRecentCards";

type RecentCardsListProps = {
  cards: RecentCardGroup[];
  onSelectCard: (card: CardRecord) => boolean | void;
  onClose: () => void;
};

export default function RecentCardsList({
  cards,
  onSelectCard,
  onClose,
}: RecentCardsListProps) {
  const { t } = useI18n();
  const [retryToken, setRetryToken] = useState(0);
  const retriedRef = useRef<Set<string>>(new Set());

  return (
    <div className={styles.recentCardsSections}>
      {cards.map((group) =>
        group.cards.length ? (
          <section key={group.id} className={styles.recentCardsSection}>
            <h3 className={styles.recentCardsSectionTitle}>{t(group.labelKey)}</h3>
            <div className={`${styles.cardsGrid} ${styles.recentCardsGrid}`}>
              {group.cards.map((card) => {
                const thumb =
                  typeof window !== "undefined"
                    ? ENABLE_CARD_THUMB_CACHE
                      ? {
                          url: getCachedCardThumbnailUrl(card.id, card.thumbnailBlob ?? null),
                          onLoad: undefined,
                          onError: () => {
                            if (!ENABLE_CARD_THUMB_CACHE) return;
                            if (retriedRef.current.has(card.id)) return;
                            retriedRef.current.add(card.id);
                            invalidateCardThumbnail(card.id);
                            setRetryToken((prev) => prev + 1);
                          },
                        }
                      : (() => {
                          const url = getLegacyCardThumbnailUrl(
                            card.id,
                            card.thumbnailBlob ?? null,
                          );
                          return {
                            url,
                            onLoad: url
                              ? () => releaseLegacyCardThumbnailUrl(url)
                              : undefined,
                            onError: undefined,
                          };
                        })()
                    : {
                        url: null as string | null,
                        onLoad: undefined as (() => void) | undefined,
                        onError: undefined as (() => void) | undefined,
                      };
                const templateThumb = cardTemplatesById[card.templateId]?.thumbnail ?? null;

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
                      src={thumb.url ?? templateThumb?.src ?? null}
                      alt={card.name}
                      variant="fluidSm"
                      fit="contain"
                      onLoad={thumb.onLoad}
                      onError={thumb.onError}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
