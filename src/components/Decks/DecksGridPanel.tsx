"use client";

import { Eye, LayersPlus, Pencil, Search, Trash2 } from "lucide-react";

import styles from "@/app/page.module.css";
import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { useDecksGridModel } from "@/components/Decks/hooks/useDecksGridModel";
import ModalShell from "@/components/common/ModalShell";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useI18n } from "@/i18n/I18nProvider";
import { useNavigate } from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const PREVIEW_VARIANT = "smMd";

export default function DecksGridPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const model = useDecksGridModel({
    untitledDeckLabel: t("decks.untitledDeck"),
  });
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [activeDeckModalDeckId, setActiveDeckModalDeckId] = useState<string | null>(null);
  const isEditMode = activeDeckModalDeckId !== null;
  const closeDeckModal = () => {
    setIsDeckModalOpen(false);
    setActiveDeckModalDeckId(null);
    model.cancelDeckDraft();
  };
  const openCreateDeckModal = () => {
    setActiveDeckModalDeckId(null);
    model.beginCreateDeckDraft();
    setIsDeckModalOpen(true);
  };
  const openEditDeckModal = (deckId: string) => {
    const didStart = model.beginEditDeckDraft(deckId);
    if (!didStart) return;
    setActiveDeckModalDeckId(deckId);
    setIsDeckModalOpen(true);
  };
  const decksGridRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingScrollDeckIdRef = useRef<string | null>(null);

  useEffect(() => {
    const pendingId = pendingScrollDeckIdRef.current;
    if (!pendingId) return;
    if (model.selectedDeckId !== pendingId) return;
    if (!model.decks.some((deck) => deck.id === pendingId)) return;
    const target = decksGridRef.current?.querySelector<HTMLButtonElement>(
      `[data-deck-id="${pendingId}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    pendingScrollDeckIdRef.current = null;
  }, [model.decks, model.selectedDeckId]);

  return (
    <>
      <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
        <div className={styles.decksGridToolbar}>
          <div
            className={`input-group input-group-sm ${styles.cardsSearchGroup}`}
            style={{ width: "17.25em" }}
          >
            <span className={`input-group-text ${styles.themedInputGroupText}`}>
              <Search className={styles.icon} aria-hidden="true" />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              className={`form-control form-control-sm ${styles.assetsSearch} ${styles.themedFormControl} ${styles.cardsSearchInputFixed} ${styles.cardsSearchInputWithClear}`}
              value={model.searchDraft}
              onChange={(event) => model.setSearchDraft(event.target.value)}
              placeholder={t("decks.searchPlaceholder")}
              aria-label={t("decks.searchLabel")}
              title={t("decks.searchLabel")}
            />
            {model.searchDraft.trim().length > 0 ? (
              <button
                type="button"
                className={`btn-close ${styles.cardsSearchClearButton}`}
                aria-label={t("actions.clear")}
                title={t("actions.clear")}
                onClick={() => {
                  model.setSearchDraft("");
                  searchInputRef.current?.focus();
                }}
              />
            ) : null}
          </div>
          <div className={styles.decksGridToolbarSpacer} />
          <button type="button" className="btn btn-primary btn-sm" onClick={openCreateDeckModal}>
            <LayersPlus className={`${styles.icon} ${styles.iconLeft}`} aria-hidden="true" />
            {t("decks.createDeck")}
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            disabled={!model.isDeleteSelectedEnabled}
            onClick={() => model.setIsDeleteDeckOpen(true)}
          >
            <Trash2 className={`${styles.icon} ${styles.iconLeft}`} aria-hidden="true" />
            {t("decks.deleteSelected")}
          </button>
        </div>
        <div
          ref={decksGridRef}
          className={styles.decksGridScroll}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest(`[data-deck-id]`)) return;
            model.clearSelectedDecks();
          }}
        >
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
            {!model.hasAnyDecks ? (
              <div className={styles.decksEmpty}>{t("decks.empty")}</div>
            ) : !model.hasVisibleResults ? (
              <div className={styles.decksEmpty}>
                {t("decks.noResults").replace("{query}", model.searchDraft.trim())}
              </div>
            ) : null}
            {model.filteredDecks.map((deck) => {
              const isSelected = model.selectedDeckIds.has(deck.id);
              return (
                <div
                  key={deck.id}
                  data-deck-id={deck.id}
                  className={`${styles.deckTile} ${isSelected ? styles.deckTileSelected : ""}`}
                  style={
                    model.deckBackgroundUrlByDeckId[deck.id]
                      ? ({
                          "--deck-preview-url": `url("${model.deckBackgroundUrlByDeckId[deck.id]}")`,
                        } as CSSProperties)
                      : undefined
                  }
                  role="button"
                  tabIndex={0}
                  onClick={(event) => model.selectDeck(deck.id, event.metaKey || event.ctrlKey)}
                  onDoubleClick={() => navigate(`/decks/${deck.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") navigate(`/decks/${deck.id}`);
                  }}
                >
                  {model.deckBackgroundUrlByDeckId[deck.id] ? (
                    <div className={styles.deckTileAtmosphereFrame} aria-hidden="true">
                      <div className={styles.deckTileAtmosphere} />
                    </div>
                  ) : null}
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
                  <div className={styles.deckTileBottom}>
                    <div className={styles.deckTileMetaSlot}>
                      <div className={styles.deckTileTitle}>
                        {model.effectiveDeckTitleById[deck.id] ?? deck.title}
                      </div>
                      <div className={styles.deckTileMeta}>
                        {new Date(deck.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={styles.deckTileActionsSlot}>
                      <div className={styles.deckTileActions}>
                        <button
                          type="button"
                          className={`btn btn-sm ${styles.deckTileOpenButton}`}
                          title={t("decks.openDeck")}
                          aria-label={t("decks.openDeck")}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/decks/${deck.id}`);
                          }}
                        >
                          <Eye className={styles.icon} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-light btn-sm"
                          title={t("actions.edit")}
                          aria-label={t("actions.edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDeckModal(deck.id);
                          }}
                        >
                          <Pencil className={styles.icon} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          title={t("actions.delete")}
                          aria-label={t("actions.delete")}
                          onClick={(event) => {
                            event.stopPropagation();
                            model.selectDeck(deck.id, false);
                            model.setIsDeleteDeckOpen(true);
                          }}
                        >
                          <Trash2 className={styles.icon} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <ModalShell
        isOpen={isDeckModalOpen}
        onClose={closeDeckModal}
        title={isEditMode ? t("decks.editDeck") : t("decks.createDeck")}
        contentClassName={styles.stockpileOverlayPanel}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const deckId = await model.submitDeckDraft();
            if (!isEditMode) pendingScrollDeckIdRef.current = deckId ?? null;
            closeDeckModal();
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
              {isEditMode ? t("actions.save") : t("decks.createDeck")}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={closeDeckModal}
            >
              {t("actions.cancel")}
            </button>
          </div>
        </form>
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
        <div>{t("decks.deleteSelectedBody").replace("{count}", String(model.selectedCount))}</div>
      </ConfirmModal>
    </>
  );
}
