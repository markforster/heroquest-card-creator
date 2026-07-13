"use client";

import { useEffect, useState } from "react";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
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
    let timeoutId: number | null = null;

    const loadCards = () => {
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
    };

    const handleCardsUpdated = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        loadCards();
      }, 250);
    };

    loadCards();
    window.addEventListener("hqcc-cards-updated", handleCardsUpdated);

    return () => {
      active = false;
      window.removeEventListener("hqcc-cards-updated", handleCardsUpdated);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
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
