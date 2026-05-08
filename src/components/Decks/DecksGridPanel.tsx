"use client";

import { Layers, Plus } from "lucide-react";

import styles from "@/app/page.module.css";
import CardFan from "@/components/Decks/CardFan";
import { useDecksGridModel } from "@/components/Decks/hooks/useDecksGridModel";
import ModalShell from "@/components/common/ModalShell";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate } from "react-router-dom";

import { useState } from "react";

const PREVIEW_FAN_COUNT = 5;
const PREVIEW_VARIANT = "smMd";

export default function DecksGridPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const model = useDecksGridModel({
    previewFanCount: PREVIEW_FAN_COUNT,
    untitledDeckLabel: t("decks.untitledDeck"),
  });
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
          onKeyDown={async (event) => {
            if (event.key === "Enter") {
              if (model.selectedDeckId) navigate(`/decks/${model.selectedDeckId}`);
              return;
            }
            if ((event.key === "Delete" || event.key === "Backspace") && model.selectedDeckIds.size > 0) {
              event.preventDefault();
              model.setIsDeleteDeckOpen(true);
              return;
            }
            if (
              (event.metaKey || event.ctrlKey) &&
              event.key.toLowerCase() === "d" &&
              model.selectedDeckId
            ) {
              event.preventDefault();
              const duplicatedId = await model.duplicateDeck(model.selectedDeckId);
              if (duplicatedId) navigate(`/decks/${duplicatedId}`);
            }
          }}
        >
          <button
            type="button"
            className={`${styles.deckTile} ${styles.deckTileCreate}`}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className={styles.deckTileCreateIcon} />
          </button>
          {model.decks.map((deck) => {
            const isSelected = model.selectedDeckIds.has(deck.id);
            const previewIds = model.deckPreviews[deck.id] ?? [];
            return (
              <button
                key={deck.id}
                type="button"
                className={`${styles.deckTile} ${isSelected ? styles.deckTileSelected : ""}`}
                onClick={(event) => model.selectDeck(deck.id, event.metaKey || event.ctrlKey)}
                onDoubleClick={() => navigate(`/decks/${deck.id}`)}
              >
                <div className={styles.deckTilePreview}>
                  <CardFan
                    cardIds={previewIds}
                    variant={PREVIEW_VARIANT}
                    maxCount={PREVIEW_FAN_COUNT}
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
                await model.createDeck();
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
              value={model.deckTitleDraft}
              onChange={(event) => model.setDeckTitleDraft(event.target.value)}
              placeholder={t("decks.untitledDeck")}
            />
          </div>
          <div className={styles.decksFormRow}>
            <label className={styles.decksLabel}>{t("decks.description")}</label>
            <textarea
              value={model.deckDescriptionDraft}
              onChange={(event) => model.setDeckDescriptionDraft(event.target.value)}
              placeholder={t("decks.descriptionPlaceholder")}
            />
          </div>
        </div>
      </ModalShell>
      <ConfirmModal
        isOpen={model.isDeleteDeckOpen}
        title={t("decks.deleteDeckTitle")}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          model.setIsDeleteDeckOpen(false);
          await model.deleteSelectedDecks();
        }}
        onCancel={() => model.setIsDeleteDeckOpen(false)}
      >
        <div>{t("decks.deleteDeckBody")}</div>
      </ConfirmModal>
    </>
  );
}
