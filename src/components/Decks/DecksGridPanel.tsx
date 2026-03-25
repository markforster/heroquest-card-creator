"use client";

import { Layers } from "lucide-react";

import type { DeckRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import CardFan from "@/components/Decks/CardFan";
import type { TFunction } from "@/i18n/types";

type DecksGridPanelProps = {
  t: TFunction;
  decks: DeckRecord[];
  deckPreviews: Record<string, string[]>;
  selectedDeckIds: Set<string>;
  selectedDeckId: string | null;
  selectedDeckIdsCount: number;
  onSelectDeck: (deckId: string, hasModifier: boolean) => void;
  onOpenDeck: (deckId: string) => void;
  onOpenSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onCreateDeck: () => void;
  deckTitleDraft: string;
  deckDescriptionDraft: string;
  setDeckTitleDraft: (value: string) => void;
  setDeckDescriptionDraft: (value: string) => void;
  deckPreviewFanCount: number;
  previewVariant: "xs" | "sm" | "smMd" | "lg";
};

export default function DecksGridPanel({
  t,
  decks,
  deckPreviews,
  selectedDeckIds,
  selectedDeckId,
  selectedDeckIdsCount,
  onSelectDeck,
  onOpenDeck,
  onOpenSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onCreateDeck,
  deckTitleDraft,
  deckDescriptionDraft,
  setDeckTitleDraft,
  setDeckDescriptionDraft,
  deckPreviewFanCount,
  previewVariant,
}: DecksGridPanelProps) {
  return (
    <>
      <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
        <div className={styles.decksHeader}>
          <div className={styles.decksHeaderTitle}>
            <Layers className={styles.decksHeaderIcon} />
            {t("actions.decks")}
          </div>
        </div>
        <div
          className={styles.decksGrid}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (selectedDeckId) onOpenDeck(selectedDeckId);
          }}
        >
          {decks.length === 0 ? (
            <div className={styles.decksEmpty}>{t("decks.empty")}</div>
          ) : (
            decks.map((deck) => {
              const isSelected = selectedDeckIds.has(deck.id);
              const previewIds = deckPreviews[deck.id] ?? [];
              return (
                <button
                  key={deck.id}
                  type="button"
                  className={`${styles.deckTile} ${isSelected ? styles.deckTileSelected : ""}`}
                  onClick={(event) => onSelectDeck(deck.id, event.metaKey || event.ctrlKey)}
                  onDoubleClick={() => onOpenDeck(deck.id)}
                >
                  <div className={styles.deckTilePreview}>
                    <CardFan
                      cardIds={previewIds}
                      variant={previewVariant}
                      maxCount={deckPreviewFanCount}
                      showPlaceholdersWhenEmpty
                      spacing={1}
                      tilt={1}
                    />
                  </div>
                  <div className={styles.deckTileTitle}>{deck.title}</div>
                  <div className={styles.deckTileMeta}>
                    {new Date(deck.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
      <aside className={`${styles.rightPanel} ${styles.decksRightPanel}`}>
        <div className={styles.decksRightSection}>
          <div className={styles.decksRightTitle}>{t("decks.createDeck")}</div>
          <div className={styles.decksFormRow}>
            <label className={styles.decksLabel}>{t("decks.title")}</label>
            <input
              type="text"
              value={deckTitleDraft}
              onChange={(event) => setDeckTitleDraft(event.target.value)}
              placeholder={t("decks.untitledDeck")}
            />
          </div>
          <div className={styles.decksFormRow}>
            <label className={styles.decksLabel}>{t("decks.description")}</label>
            <textarea
              value={deckDescriptionDraft}
              onChange={(event) => setDeckDescriptionDraft(event.target.value)}
              placeholder={t("decks.descriptionPlaceholder")}
            />
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={onCreateDeck}>
            {t("decks.createDeck")}
          </button>
        </div>
        <div className={styles.decksRightSection}>
          <div className={styles.decksRightTitle}>{t("decks.actions")}</div>
          <div className={styles.decksActionRow}>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              disabled={!selectedDeckId}
              onClick={onOpenSelected}
            >
              {t("decks.openDeck")}
            </button>
            <button
              type="button"
              className="btn btn-outline-light btn-sm"
              disabled={!selectedDeckId}
              onClick={onDuplicateSelected}
            >
              {t("actions.duplicate")}
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={selectedDeckIdsCount === 0}
              onClick={onDeleteSelected}
            >
              {t("actions.delete")}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
