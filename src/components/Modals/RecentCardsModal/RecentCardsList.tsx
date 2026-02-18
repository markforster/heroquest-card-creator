"use client";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
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

  return (
    <div className={styles.recentCardsSections}>
      {cards.map((group) =>
        group.cards.length ? (
          <section key={group.id} className={styles.recentCardsSection}>
            <h3 className={styles.recentCardsSectionTitle}>{t(group.labelKey)}</h3>
            <div className={`${styles.cardsGrid} ${styles.recentCardsGrid}`}>
              {group.cards.map((card) => {
                const thumbUrl =
                  typeof window !== "undefined" && card.thumbnailBlob
                    ? URL.createObjectURL(card.thumbnailBlob)
                    : null;
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
                      src={thumbUrl ?? templateThumb?.src ?? null}
                      alt={card.name}
                      variant="fluidSm"
                      fit="contain"
                      onLoad={
                        thumbUrl
                          ? () => {
                              URL.revokeObjectURL(thumbUrl);
                            }
                          : undefined
                      }
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
