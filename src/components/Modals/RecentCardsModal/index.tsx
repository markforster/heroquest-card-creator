"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import { listCards } from "@/lib/cards-db";
import type { CardRecord } from "@/types/cards-db";
import type { OpenCloseProps } from "@/types/ui";

import LoadingMessage from "./LoadingMessage";
import RecentCardsList from "./RecentCardsList";
import { useRecentCards } from "./useRecentCards";

type RecentCardsModalProps = OpenCloseProps & {
  onSelectCard: (card: CardRecord) => boolean | void;
};

const RECENT_LIMIT = 100;

export default function RecentCardsModal({ isOpen, onClose, onSelectCard }: RecentCardsModalProps) {
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

  const recentCards = useRecentCards({ cards, limit: RECENT_LIMIT });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("actions.recentCards")}
      contentClassName={styles.recentPopover}
      keepMounted
    >
      {isLoading ? (
        <LoadingMessage>{t("ui.loading")}</LoadingMessage>
      ) : recentCards.length === 0 ? (
        <div className={styles.templatePopoverMessage}>{t("empty.noRecentCards")}</div>
      ) : (
        <RecentCardsList
          cards={recentCards}
          language={language}
          onSelectCard={onSelectCard}
          onClose={onClose}
        />
      )}
    </ModalShell>
  );
}
