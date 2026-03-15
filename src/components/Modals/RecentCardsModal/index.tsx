"use client";

import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import { apiClient } from "@/api/client";
import type { CardRecord } from "@/api/cards";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";

import LoadingMessage from "./LoadingMessage";
import RecentCardsList from "./RecentCardsList";
import { useRecentCards } from "./useRecentCards";

type RecentCardsModalProps = OpenCloseProps & {
  onSelectCard: (card: CardRecord) => boolean | void;
};

export default function RecentCardsModal({ isOpen, onClose, onSelectCard }: RecentCardsModalProps) {
  const { t } = useI18n();
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    apiClient
      .listCards({ queries: { status: "saved" } })
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

  const recentCards = useRecentCards({ cards });
  const hasCards = recentCards.some((group) => group.cards.length > 0);

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
      ) : !hasCards ? (
        <div className={styles.templatePopoverMessage}>{t("empty.noRecentCards")}</div>
      ) : (
        <RecentCardsList cards={recentCards} onSelectCard={onSelectCard} onClose={onClose} />
      )}
    </ModalShell>
  );
}
