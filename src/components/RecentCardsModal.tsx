"use client";

import { useEffect, useMemo, useState } from "react";

import ModalShell from "@/components/ModalShell";
import styles from "@/app/page.module.css";
import { cardTemplatesById } from "@/data/card-templates";
import { useI18n } from "@/i18n/I18nProvider";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { listCards } from "@/lib/cards-db";

import type { CardRecord } from "@/types/cards-db";

type RecentCardsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: (card: CardRecord) => boolean | void;
};

const RECENT_LIMIT = 100;

export default function RecentCardsModal({
  isOpen,
  onClose,
  onSelectCard,
}: RecentCardsModalProps) {
  const { t, language } = useI18n();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    listCards({ status: "saved" })
      .then((items) => {
        if (!active) return;
        setCards(items);
      })
      .catch(() => {
        if (!active) return;
        setCards([]);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const recentCards = useMemo(() => {
    const sorted = [...cards].sort((a, b) => {
      const aViewed = a.lastViewedAt ?? 0;
      const bViewed = b.lastViewedAt ?? 0;
      if (bViewed !== aViewed) return bViewed - aViewed;
      if (b.updatedAt !== a.updatedAt) return b.updatedAt - a.updatedAt;
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });
    return sorted.slice(0, RECENT_LIMIT);
  }, [cards]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("actions.recentCards")}
      contentClassName={styles.recentPopover}
      keepMounted
    >
      {isLoading ? (
        <div className={styles.templatePopoverMessage}>{t("ui.loading")}</div>
      ) : recentCards.length === 0 ? (
        <div className={styles.templatePopoverMessage}>{t("empty.noRecentCards")}</div>
      ) : (
        <div className={styles.cardsGrid}>
          {recentCards.map((card) => {
            const template = cardTemplatesById[card.templateId];
            const templateLabel = template ? getTemplateNameLabel(language, template) : card.templateId;
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
      )}
    </ModalShell>
  );
}
