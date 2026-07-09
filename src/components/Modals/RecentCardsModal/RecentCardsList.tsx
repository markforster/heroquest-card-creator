"use client";

import { useRef, useState } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import SavedCardTile from "@/components/common/SavedCardTile";
import { ENABLE_CARD_THUMB_CACHE } from "@/config/flags";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { normalizeFileProtocolAssetUrl } from "@/lib/browser";
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
  templateLabel: string;
  templateThumbSrc: string | null;
  onSelectCard: (card: CardRecord) => boolean | void;
  onClose: () => void;
  onThumbError: (cardId: string) => void;
};

function RecentCardItem({
  card,
  retryToken,
  templateLabel,
  templateThumbSrc,
  onSelectCard,
  onClose,
  onThumbError,
}: RecentCardItemProps) {
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
      <SavedCardTile
        title={card.name}
        templateLabel={templateLabel}
        variant="recent"
        typePillClassName={`${styles.cardsItemTemplate} ${styles[`cardsType_${card.templateId}`]}`}
        thumbnail={
          <CardThumbnail
            key={`${card.id}-${retryToken}`}
            src={thumbUrl ?? templateThumbSrc}
            alt={card.name}
            variant="fluidSm"
            fit="contain"
            onError={() => onThumbError(card.id)}
          />
        }
      />
    </button>
  );
}

export default function RecentCardsList({
  cards,
  onSelectCard,
  onClose,
}: RecentCardsListProps) {
  const { language, t } = useI18n();
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
                const template = cardTemplatesById[card.templateId];
                const templateLabel = template
                  ? getTemplateNameLabel(language, template)
                  : card.templateId;
                const templateThumbSrcRaw = template?.thumbnail?.src ?? null;
                const templateThumbSrc = templateThumbSrcRaw
                  ? normalizeFileProtocolAssetUrl(templateThumbSrcRaw)
                  : null;

                return (
                  <RecentCardItem
                    key={card.id}
                    card={card}
                    retryToken={retryToken}
                    templateLabel={templateLabel}
                    templateThumbSrc={templateThumbSrc}
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
