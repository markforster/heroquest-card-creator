"use client";

import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import type { CardRecord } from "@/types/cards-db";

import type { SupportedLanguage } from "@/i18n/messages";

type RecentCardsListProps = {
  cards: CardRecord[];
  language: SupportedLanguage;
  onSelectCard: (card: CardRecord) => boolean | void;
  onClose: () => void;
};

export default function RecentCardsList({
  cards,
  language,
  onSelectCard,
  onClose,
}: RecentCardsListProps) {
  const { t } = useI18n();

  return (
    <div className={styles.cardsGrid}>
      {cards.map((card) => {
        const template = cardTemplatesById[card.templateId];
        const templateLabel = template
          ? getTemplateNameLabel(language, template)
          : card.templateId;
        const thumbUrl =
          typeof window !== "undefined" && card.thumbnailBlob
            ? URL.createObjectURL(card.thumbnailBlob)
            : null;
        const templateThumb = template?.thumbnail ?? null;

        return (
          <button
            key={card.id}
            type="button"
            className={styles.cardsItem}
            onClick={() => {
              const shouldClose = onSelectCard(card);
              if (shouldClose !== false) {
                onClose();
              }
            }}
          >
            <div className={styles.cardsItemHeader}>
              <div className={styles.cardsItemName} title={card.name}>
                {card.name}
              </div>
            </div>
            <div className={styles.cardsThumbWrapper}>
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl}
                  alt={card.name}
                  className={styles.cardsThumbImage}
                  onLoad={() => {
                    URL.revokeObjectURL(thumbUrl);
                  }}
                />
              ) : templateThumb?.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={templateThumb.src} alt={card.name} className={styles.cardsThumbImage} />
              ) : null}
            </div>
            <div className={styles.cardsItemMeta}>
              <div
                className={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
              >
                {templateLabel}
              </div>
              <div className={styles.cardsItemDetails}>
                {t("label.lastEdited")} {new Date(card.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
