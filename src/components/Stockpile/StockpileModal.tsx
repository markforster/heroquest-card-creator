"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";
import { deleteCards, listCards } from "@/lib/cards-db";
import type { CardRecord } from "@/types/cards-db";

type StockpileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
};

export default function StockpileModal({
  isOpen,
  onClose,
  onLoadCard,
  refreshToken,
  activeCardId,
}: StockpileModalProps) {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    listCards({ status: "saved" })
      .then((results) => {
        if (!cancelled) {
          setCards(results);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCards([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, refreshToken]);

  const filteredCards = useMemo(() => {
    let next = cards;

    if (templateFilter !== "all") {
      next = next.filter((card) => card.templateId === templateFilter);
    }

    if (search.trim()) {
      const q = search.toLocaleLowerCase();
      next = next.filter((card) => card.nameLower.includes(q));
    }

    return next;
  }, [cards, search, templateFilter]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => prev ?? activeCardId ?? null);
  }, [isOpen, activeCardId]);

  const selectedCard = selectedId ? cards.find((card) => card.id === selectedId) : undefined;

  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Cards"
      contentClassName={styles.cardsPopover}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!selectedCard}
          onClick={() => {
            if (!selectedCard || !onLoadCard) return;
            onLoadCard(selectedCard);
            onClose();
          }}
        >
          Load
        </button>
      }
    >
      <div className={styles.assetsToolbar}>
        <div className={styles.cardsFilters}>
          <div className="input-group input-group-sm" style={{ maxWidth: 260 }}>
            <span className="input-group-text">
              <Search className={styles.icon} aria-hidden="true" />
            </span>
            <input
              type="search"
              placeholder="Search cards..."
              className={`form-control form-control-sm bg-white text-dark ${styles.assetsSearch}`}
              title="Search saved cards by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className={`form-select form-select-sm ${styles.cardsFilterSelect}`}
            title="Filter cards by template type"
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="hero">Hero</option>
            <option value="monster">Monster</option>
            <option value="large-treasure">Large treasure</option>
            <option value="small-treasure">Small treasure</option>
            <option value="hero-back">Hero back</option>
            <option value="labelled-back">Labelled back</option>
          </select>
        </div>
        <div className={styles.assetsToolbarSpacer} />
        <div className={styles.assetsActions}>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            disabled={!selectedCard}
            onClick={async () => {
              if (!selectedCard) return;
              const confirmDelete = window.confirm(
                "Delete this card from your library? This cannot be undone.",
              );
              if (!confirmDelete) return;

              try {
                await deleteCards([selectedCard.id]);
                const refreshed = await listCards({ status: "saved" });
                setCards(refreshed);
                setSelectedId(null);
              } catch (error) {
                // eslint-disable-next-line no-console
                console.error("[StockpileModal] Failed to delete card", error);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <div className={styles.assetsGridContainer}>
        {filteredCards.length === 0 ? (
          <div className={styles.assetsEmptyState}>No saved cards yet.</div>
        ) : (
          <div className={styles.assetsGrid}>
            {filteredCards.map((card) => {
              const updated = new Date(card.updatedAt);
              const updatedLabel = updated.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
              });
              const timeLabel = updated.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              });

              const thumbUrl =
                typeof window !== "undefined" && card.thumbnailBlob
                  ? URL.createObjectURL(card.thumbnailBlob)
                  : null;
              const isSelected = selectedId === card.id;

              return (
                <button
                  key={card.id}
                  type="button"
                  className={`${styles.assetsItem} ${isSelected ? styles.assetsItemSelected : ""}`}
                  onClick={() => {
                    setSelectedId((prev) => (prev === card.id ? prev : card.id));
                  }}
                  onDoubleClick={() => {
                    if (!onLoadCard) return;
                    onLoadCard(card);
                    onClose();
                  }}
                >
                  <div className={styles.cardsItemHeader}>
                    <div className={styles.cardsItemName}>{card.name}</div>
                  </div>
                  <div className={styles.cardsItemBody}>
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
                      ) : null}
                    </div>
                    <div className={styles.cardsItemMeta}>
                      <div className={styles.cardsItemDetails}>
                        <span className={styles.cardsItemTemplate}>{card.templateId}</span>
                        <span>·</span>
                        <span>
                          {updatedLabel} {timeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
