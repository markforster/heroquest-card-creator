"use client";

import { useDraggable } from "@dnd-kit/core";
import { BringToFront, ChevronLeft, ChevronRight, Search, SendToBack } from "lucide-react";
import { useMemo, useRef } from "react";
import type { ReactNode } from "react";

import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import DeckFaceCardsFilterSelect from "@/components/Decks/detail/DeckFaceCardsFilterSelect";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import type { RightPanelFaceMode } from "@/components/Decks/types/deck-backs";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";

const BACK_PANEL_TILE_VARIANT = "smMd";
const DECK_FACE_FILTER_MODE: "select" | "tree" = "select";

function BackPanelThumb({
  cardId,
  variant = BACK_PANEL_TILE_VARIANT,
}: {
  cardId: string;
  variant?: "sm" | "smMd";
}) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={variant}
      fit="contain"
      className={styles.deckSetThumb}
      fallback={<div className={styles.deckSetThumbFallback} />}
    />
  );
}

function BackPanelDraggableThumb({
  cardId,
  faceMode,
}: {
  cardId: string;
  faceMode: RightPanelFaceMode;
}) {
  const dragType = faceMode === "back" ? "back-face" : "front-face";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${faceMode}:${cardId}`,
    data:
      faceMode === "back"
        ? { type: dragType, backFaceId: cardId }
        : { type: dragType, frontFaceId: cardId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckBacksThumb} ${isDragging ? styles.deckBacksThumbDragging : ""}`}
      style={{ touchAction: "none", cursor: isDragging ? "grabbing" : "grab" }}
      {...attributes}
      {...listeners}
    >
      <BackPanelThumb cardId={cardId} />
    </div>
  );
}

export default function DeckBacksPanel({
  usedBackFaceIds,
  usedFrontFaceIds,
  finalizingBackFaceId,
  finalizingFrontFaceId,
  gridOverride,
}: {
  usedBackFaceIds: Set<string>;
  usedFrontFaceIds: Set<string>;
  finalizingBackFaceId: string | null;
  finalizingFrontFaceId: string | null;
  gridOverride?: ReactNode;
}) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const {
    isRightPanelVisible,
    setIsRightPanelVisible,
    toggleRightPanel,
    backCollections: collections,
    backCards: cards,
    rightPanelEmptyLabel: emptyLabel,
    backFilter: activeFilter,
    setBackFilter: onFilterChange,
    rightPanelFaceMode: faceMode,
    setRightPanelFaceMode: onFaceModeChange,
    sourceSearch: search,
    setSourceSearch: setSearch,
  } = useDeckRightPanel();
  const isViewOpen = isRightPanelVisible;
  const handleFaceModeChange = (nextMode: RightPanelFaceMode) => {
    onFaceModeChange(nextMode);
    if (!isViewOpen) setIsRightPanelVisible(true);
  };
  const sourceCards = useMemo(
    () =>
      faceMode === "back"
        ? cards.filter((card) => !usedBackFaceIds.has(card.id) && card.id !== finalizingBackFaceId)
        : cards.filter(
            (card) => !usedFrontFaceIds.has(card.id) && card.id !== finalizingFrontFaceId,
          ),
    [
      cards,
      faceMode,
      usedBackFaceIds,
      usedFrontFaceIds,
      finalizingBackFaceId,
      finalizingFrontFaceId,
    ],
  );

  const {
    filteredCards,
    collectionCounts,
    unfiledCount,
    visibleCollectionIds,
    overallCount,
    recentCards,
    recentlyDeletedCount,
    recentlyDeletedTotalCount,
  } = useStockpileFilters({
    cards: sourceCards,
    collections,
    search,
    templateFilter: faceMode,
    activeFilter,
    isPairMode: true,
    isPairBacks: faceMode === "back",
    showUnpairedOnly: false,
    showMissingArtworkOnly: false,
  });

  const visibleCollections = collections.filter((collection) =>
    visibleCollectionIds.has(collection.id),
  );
  const faceModeTitle = faceMode === "back" ? "Back faces" : "Front faces";

  return (
    <div className={styles.deckBacksPanel}>
      <div className={styles.deckBacksContent}>
        <button
          type="button"
          className={styles.deckBacksToggle}
          onClick={toggleRightPanel}
          title={t("decks.sourcePanelToggle")}
          aria-label={t("decks.sourcePanelToggle")}
        >
          {isViewOpen ? (
            <ChevronRight className={styles.deckBacksToggleIcon} aria-hidden="true" />
          ) : (
            <ChevronLeft className={styles.deckBacksToggleIcon} aria-hidden="true" />
          )}
        </button>
        <div
          className={`${styles.deckBacksMain} ${
            isViewOpen ? styles.deckBacksMainOpen : styles.deckBacksMainClosed
          }`}
        >
          <div
            className={`${styles.deckBacksFilter} ${
              DECK_FACE_FILTER_MODE === "tree" ? styles.deckBacksFilterTreeMode : ""
            }`}
          >
            {DECK_FACE_FILTER_MODE === "select" ? (
              <div className={styles.deckFaceCardsFilterStack}>
                <div className={styles.deckFaceModeHeader}>
                  <div className={styles.deckFaceModeTitle}>{faceModeTitle}</div>
                </div>
                <div className={`input-group input-group-sm ${styles.cardsSearchGroup}`}>
                  <span className={`input-group-text ${styles.themedInputGroupText}`}>
                    <Search className={styles.icon} aria-hidden="true" />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder={t("placeholders.searchCards")}
                    className={`form-control form-control-sm ${styles.assetsSearch} ${styles.themedFormControl} ${styles.cardsSearchInputWithClear} ${styles.deckFaceCardsSearchInput}`}
                    title={t("tooltip.searchCards")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search.trim().length > 0 ? (
                    <button
                      type="button"
                      className={`btn-close ${styles.cardsSearchClearButton}`}
                      aria-label={t("actions.clear")}
                      title={t("actions.clear")}
                      onClick={() => {
                        setSearch("");
                        searchInputRef.current?.focus();
                      }}
                    />
                  ) : null}
                </div>
                <DeckFaceCardsFilterSelect
                  activeFilter={activeFilter}
                  onFilterChange={onFilterChange}
                  visibleCollections={visibleCollections}
                  collectionCounts={collectionCounts}
                  recentCardsCount={recentCards.length}
                  overallCount={overallCount}
                  unfiledCount={unfiledCount}
                />
              </div>
            ) : (
              <StockpileSidebar
                dragEnabled={false}
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
                isPairMode
                showMissingArtworkOnly={false}
                collectionsWithMissingArtwork={new Set()}
                selectedIds={[]}
                onClearSelection={() => {}}
                recentCardsCount={recentCards.length}
                recentlyDeletedCount={recentlyDeletedCount}
                recentlyDeletedTotalCount={recentlyDeletedTotalCount}
                overallCount={overallCount}
                unfiledCount={unfiledCount}
                visibleCollections={visibleCollections}
                collectionCounts={collectionCounts}
                selectedCountByCollection={new Map()}
              />
            )}
          </div>
          <div className={styles.deckBacksGridPanel}>
            {gridOverride ? (
              gridOverride
            ) : filteredCards.length === 0 ? (
              <div className={styles.decksEmpty}>{emptyLabel}</div>
            ) : (
              <div className={styles.deckBacksGrid}>
                {filteredCards.map((card) => (
                  <BackPanelDraggableThumb key={card.id} cardId={card.id} faceMode={faceMode} />
                ))}
              </div>
            )}
          </div>
        </div>
        <div
          className={`nav nav-pills flex-column ${styles.deckBacksTabRail}`}
          role="tablist"
          aria-label="Face mode"
          aria-orientation="vertical"
        >
          <button
            type="button"
            role="tab"
            className={`${styles.leftNavItem} ${styles.deckBacksTabButton} ${
              faceMode === "back" ? styles.leftNavItemActive : ""
            }`}
            aria-selected={faceMode === "back"}
            aria-pressed={faceMode === "back"}
            aria-label="Back faces"
            title="Back faces"
            onClick={() => handleFaceModeChange("back")}
          >
            <span className={styles.leftNavGlyph} aria-hidden="true">
              <SendToBack className={styles.deckBacksTabIcon} aria-hidden="true" />
            </span>
          </button>
          <button
            type="button"
            role="tab"
            className={`${styles.leftNavItem} ${styles.deckBacksTabButton} ${
              faceMode === "front" ? styles.leftNavItemActive : ""
            }`}
            aria-selected={faceMode === "front"}
            aria-pressed={faceMode === "front"}
            aria-label="Front faces"
            title="Front faces"
            onClick={() => handleFaceModeChange("front")}
          >
            <span className={styles.leftNavGlyph} aria-hidden="true">
              <BringToFront className={styles.deckBacksTabIcon} aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeckBacksOverlayThumb({
  cardId,
  variant = "smMd",
}: {
  cardId: string;
  variant?: "sm" | "smMd";
}) {
  return <BackPanelThumb cardId={cardId} variant={variant} />;
}
