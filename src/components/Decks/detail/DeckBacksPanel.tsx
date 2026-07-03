"use client";

import {
  BringToFront,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Info,
  Search,
  SendToBack,
} from "lucide-react";
import { useMemo, useRef } from "react";

import styles from "@/app/page.module.css";
import DeckInfoPanel from "@/components/Decks/detail/DeckInfoPanel";
import DeckPreviewPanel from "@/components/Decks/detail/DeckPreviewPanel";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import DeckFaceCardsFilterSelect from "@/components/Decks/detail/DeckFaceCardsFilterSelect";
import type { RightPanelFaceMode } from "@/components/Decks/types/deck-backs";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";
import { useI18n } from "@/i18n/I18nProvider";

import { BackPanelDraggableThumb } from "./BackPanelDraggableThumb";
import { BackPanelThumb } from "./BackPanelThumb";

import type { ReactNode } from "react";

const DECK_FACE_FILTER_MODE: "select" | "tree" = "select";

export default function DeckBacksPanel({
  deckId,
  usedBackFaceIds,
  usedFrontFaceIds,
  finalizingBackFaceId,
  finalizingFrontFaceId,
  gridOverride,
}: {
  deckId: string | null;
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
  const filterFaceMode: "back" | "front" = faceMode === "front" ? "front" : "back";
  const handleFaceModeChange = (nextMode: RightPanelFaceMode) => {
    onFaceModeChange(nextMode);
    if (!isViewOpen) setIsRightPanelVisible(true);
  };
  const sourceCards = useMemo(
    () =>
      filterFaceMode === "back"
        ? cards.filter((card) => !usedBackFaceIds.has(card.id) && card.id !== finalizingBackFaceId)
        : cards.filter(
            (card) => !usedFrontFaceIds.has(card.id) && card.id !== finalizingFrontFaceId,
          ),
    [
      cards,
      filterFaceMode,
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
    templateFilter: filterFaceMode,
    activeFilter,
    isPairMode: true,
    isPairBacks: filterFaceMode === "back",
    showUnpairedOnly: false,
    showMissingArtworkOnly: false,
  });

  const visibleCollections = collections.filter((collection) =>
    visibleCollectionIds.has(collection.id),
  );
  const faceModeTitle = faceMode === "front" ? t("decks.faces.front") : t("decks.faces.back");
  const isPreviewMode = faceMode === "preview";
  const isMetaMode = faceMode === "meta";

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
          {!isMetaMode && !isPreviewMode ? (
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
          ) : null}
          {isMetaMode ? (
            <DeckInfoPanel deckId={deckId} />
          ) : isPreviewMode ? (
            <DeckPreviewPanel />
          ) : (
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
          )}
        </div>
        <div
          className={styles.deckBacksTabRail}
          role="tablist"
          aria-label={t("decks.faces.mode")}
          aria-orientation="vertical"
        >
          <div className={styles.deckBacksTabRailTop}>
            <button
              type="button"
              role="tab"
              className={`${styles.leftNavItem} ${styles.deckBacksTabButton} ${
                faceMode === "back" ? styles.leftNavItemActive : ""
              }`}
              aria-selected={faceMode === "back"}
              aria-pressed={faceMode === "back"}
              aria-label={t("decks.faces.back")}
              title={t("decks.faces.back")}
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
              aria-label={t("decks.faces.front")}
              title={t("decks.faces.front")}
              onClick={() => handleFaceModeChange("front")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <BringToFront className={styles.deckBacksTabIcon} aria-hidden="true" />
              </span>
            </button>
          </div>
          <div className={styles.deckBacksTabRailSpacer} />
          <div className={styles.deckBacksTabRailBottom}>
            <button
              type="button"
              role="tab"
              className={`${styles.leftNavItem} ${styles.deckBacksTabButton} ${
                faceMode === "preview" ? styles.leftNavItemActive : ""
              }`}
              aria-selected={faceMode === "preview"}
              aria-pressed={faceMode === "preview"}
              aria-label={t("label.preview")}
              title={t("label.preview")}
              onClick={() => handleFaceModeChange("preview")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <ImageIcon className={styles.deckBacksTabIcon} aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              role="tab"
              className={`${styles.leftNavItem} ${styles.deckBacksTabButton} ${
                faceMode === "meta" ? styles.leftNavItemActive : ""
              }`}
              aria-selected={faceMode === "meta"}
              aria-pressed={faceMode === "meta"}
              aria-label={t("decks.meta.tab")}
              title={t("decks.meta.tab")}
              onClick={() => handleFaceModeChange("meta")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Info className={styles.deckBacksTabIcon} aria-hidden="true" />
              </span>
            </button>
          </div>
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
