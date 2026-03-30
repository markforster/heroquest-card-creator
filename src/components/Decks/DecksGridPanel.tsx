"use client";

import { Layers, Plus } from "lucide-react";

import type { DeckRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import CardFan from "@/components/Decks/CardFan";
import ModalShell from "@/components/common/ModalShell";
import type { TFunction } from "@/i18n/types";

import { useState } from "react";

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
  onCreateDeck: () => Promise<void> | void;
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const closeCreateModal = () => setIsCreateOpen(false);
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
          <button
            type="button"
            className={`${styles.deckTile} ${styles.deckTileCreate}`}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className={styles.deckTileCreateIcon} />
          </button>
          {decks.map((deck) => {
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
          })}
        </div>
      </section>
      <ModalShell
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        title={t("decks.createDeck")}
        footer={
          <>
            <button type="button" className="btn btn-outline-light" onClick={closeCreateModal}>
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                await onCreateDeck();
                closeCreateModal();
              }}
            >
              {t("decks.createDeck")}
            </button>
          </>
        }
      >
        <div className={styles.decksCreateModalBody}>
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
        </div>
      </ModalShell>
    </>
  );
}
