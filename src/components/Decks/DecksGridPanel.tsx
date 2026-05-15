"use client";

import { LayersPlus, Pencil, Trash2 } from "lucide-react";

import styles from "@/app/page.module.css";
import DeckExportButton from "@/components/Decks/DeckExportButton";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { useDecksGridModel } from "@/components/Decks/hooks/useDecksGridModel";
import IconButton from "@/components/common/IconButton";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate } from "react-router-dom";

import { useEffect, useRef, useState } from "react";

const PREVIEW_VARIANT = "smMd";
const DECK_GRID_TITLE_INPUT_ID = "deck-grid-title-input";

export default function DecksGridPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const model = useDecksGridModel({
    untitledDeckLabel: t("decks.untitledDeck"),
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const closeCreateModal = () => setIsCreateOpen(false);
  const deckNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!model.isDeckTitleEditing) return;
    deckNameInputRef.current?.focus();
    deckNameInputRef.current?.select();
  }, [model.isDeckTitleEditing]);

  return (
    <>
      <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
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
            <LayersPlus className={styles.deckTileCreateIcon} />
          </button>
          {model.decks.map((deck) => {
            const isSelected = model.selectedDeckIds.has(deck.id);
            return (
              <button
                key={deck.id}
                type="button"
                className={`${styles.deckTile} ${isSelected ? styles.deckTileSelected : ""}`}
                onClick={(event) => model.selectDeck(deck.id, event.metaKey || event.ctrlKey)}
                onDoubleClick={() => navigate(`/decks/${deck.id}`)}
              >
                <div className={styles.deckTilePreview}>
                  <DeckFanByDeckId
                    deckId={deck.id}
                    variant={PREVIEW_VARIANT}
                    maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
                    showPlaceholdersWhenEmpty
                    emptyPlaceholderVariant="deck-empty"
                    spacing={1}
                    tilt={1}
                  />
                </div>
                <div className={styles.deckTileTitle}>
                  {model.effectiveDeckTitleById[deck.id] ?? deck.title}
                </div>
                <div className={styles.deckTileMeta}>
                  {new Date(deck.updatedAt).toLocaleDateString()}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <aside className={`${styles.rightPanel} ${styles.decksRightPanel}`}>
        <div className={`${styles.assetsToolbar} d-flex align-items-center gap-2 px-2 py-2`}>
          <IconButton
            className="btn btn-primary btn-sm"
            icon={Pencil}
            title="Edit"
            disabled={!model.canRenameDeck}
            onClick={() => {
              if (!model.selectedDeckId) return;
              navigate(`/decks/${model.selectedDeckId}`);
            }}
          >
            Edit
          </IconButton>
          <IconButton
            className="btn btn-outline-danger btn-sm"
            icon={Trash2}
            title={t("actions.delete")}
            disabled={!model.canDeleteDecks}
            onClick={() => model.setIsDeleteDeckOpen(true)}
          >
            {t("actions.delete")}
          </IconButton>
        </div>
        <div className={styles.decksRightSection}>
          {model.selectedDeckIds.size === 0 ? (
            <div className={styles.decksEmpty}>{t("decks.noDeckSelected")}</div>
          ) : (
            <div className={styles.decksFormRow}>
              <label className={styles.decksLabel} htmlFor={DECK_GRID_TITLE_INPUT_ID}>
                {t("decks.title")}
              </label>
              <input
                id={DECK_GRID_TITLE_INPUT_ID}
                ref={deckNameInputRef}
                type="text"
                value={model.selectedDeckTitleDraft}
                disabled={!model.canRenameDeck}
                placeholder={t("decks.untitledDeck")}
                onChange={(event) => {
                  model.onDeckTitleDraftChangeLive(event.target.value);
                }}
                onFocus={() => {
                  if (!model.canRenameDeck) return;
                  if (!model.isDeckTitleEditing) {
                    model.startDeckTitleEdit();
                  }
                }}
                onBlur={async () => {
                  if (!model.isDeckTitleEditing) return;
                  await model.commitDeckTitleEdit();
                }}
                onKeyDown={async (event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    await model.commitDeckTitleEdit();
                    return;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    model.cancelDeckTitleEdit();
                    deckNameInputRef.current?.blur();
                  }
                }}
              />
            </div>
          )}
        </div>
        <div className={styles.decksGridRightMiddle} />
        <div className={`${styles.assetsToolbar} d-flex align-items-center gap-2 px-2 py-2`}>
          <DeckExportButton
            deckId={model.selectedDeckId ?? null}
            scope="decks_grid"
            disabled={!model.selectedDeckId}
            label={t("actions.export")}
          />
        </div>
      </aside>
      {isCreateOpen ? (
        <div className={styles.stockpileOverlayBackdrop} onClick={closeCreateModal}>
          <div className={styles.stockpileOverlayPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.stockpileOverlayHeader}>
              <h3 className={styles.stockpileOverlayTitle}>{t("decks.createDeck")}</h3>
              <button type="button" className={styles.modalCloseButton} onClick={closeCreateModal}>
                <span className="visually-hidden">{t("actions.close")}</span>✕
              </button>
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await model.createDeck();
                closeCreateModal();
              }}
            >
              <div className="d-flex flex-column gap-2">
                <label className="d-flex flex-column gap-1">
                  <span>{t("decks.title")}</span>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={model.deckTitleDraft}
                    onChange={(event) => model.setDeckTitleDraft(event.target.value)}
                    placeholder={t("decks.untitledDeck")}
                    autoFocus
                  />
                </label>
                <label className="d-flex flex-column gap-1">
                  <span>{t("decks.description")}</span>
                  <textarea
                    className="form-control form-control-sm"
                    value={model.deckDescriptionDraft}
                    onChange={(event) => model.setDeckDescriptionDraft(event.target.value)}
                    placeholder={t("decks.descriptionPlaceholder")}
                    rows={3}
                  />
                </label>
              </div>
              <div className={styles.stockpileOverlayActions}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {t("decks.createDeck")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={closeCreateModal}
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
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
