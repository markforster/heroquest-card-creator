"use client";

import { useDraggable } from "@dnd-kit/core";
import { BringToFront, ChevronLeft, ChevronRight, Info, Search, SendToBack } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import styles from "@/app/page.module.css";
import { apiClient } from "@/api/client";
import CardFan from "@/components/Decks/CardFan";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { resolveDeckExportFaceIds } from "@/components/Decks/deck-export";
import { listPairsMap, orderDeckPreviewCandidateIds } from "@/components/Decks/deck-preview";
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

function buildDeckPreviewCardIds({
  keySetId,
  groups,
  sets,
}: {
  keySetId: string | null;
  groups: Array<{ id: string; sortIndex?: number }>;
  sets: Array<{ id: string; groupId: string; backFaceId: string; sortIndex?: number }>;
}) {
  const orderedGroups = [...groups].sort(
    (a, b) => (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER),
  );
  const setsByGroup = new Map<string, typeof sets>();
  sets.forEach((set) => {
    const list = setsByGroup.get(set.groupId) ?? [];
    list.push(set);
    setsByGroup.set(set.groupId, list);
  });
  setsByGroup.forEach((list, groupId) => {
    setsByGroup.set(
      groupId,
      [...list].sort(
        (a, b) => (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER),
      ),
    );
  });
  const orderedSets = orderedGroups.flatMap((group) => setsByGroup.get(group.id) ?? []);
  const seen = new Set<string>();
  const ids: string[] = [];

  if (keySetId) {
    const keySet = orderedSets.find((set) => set.id === keySetId) ?? null;
    if (keySet?.backFaceId && !seen.has(keySet.backFaceId)) {
      ids.push(keySet.backFaceId);
      seen.add(keySet.backFaceId);
    }
  }

  for (const set of orderedSets) {
    if (set.id === keySetId) continue;
    if (!set.backFaceId || seen.has(set.backFaceId)) continue;
    ids.push(set.backFaceId);
    seen.add(set.backFaceId);
    if (ids.length >= DEFAULT_DECK_FAN_PREVIEW_COUNT) break;
  }

  return orderDeckPreviewCandidateIds(ids.slice(0, DEFAULT_DECK_FAN_PREVIEW_COUNT));
}

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
  const isMetaMode = faceMode === "meta";
  const [metaState, setMetaState] = useState<{
    isLoading: boolean;
    error: boolean;
    createdAt: number | null;
    updatedAt: number | null;
    groupCount: number;
    setCount: number;
    entryCount: number;
    imageExport: { totalCount: number; frontCount: number; backCount: number; setCount: number };
    uniquePairCount: number;
    quantityTotal: number;
    pairedNotInSetCount: number;
    deckPreviewCardIds: string[];
  }>({
    isLoading: false,
    error: false,
    createdAt: null,
    updatedAt: null,
    groupCount: 0,
    setCount: 0,
    entryCount: 0,
    imageExport: { totalCount: 0, frontCount: 0, backCount: 0, setCount: 0 },
    uniquePairCount: 0,
    quantityTotal: 0,
    pairedNotInSetCount: 0,
    deckPreviewCardIds: [],
  });

  useEffect(() => {
    let cancelled = false;
    const loadMetadata = async () => {
      if (!isMetaMode || !deckId) return;
      setMetaState((prev) => ({ ...prev, isLoading: true, error: false }));
      try {
        const [deck, groups, sets, pairMap, imageExport] = await Promise.all([
          apiClient.getDeck({ params: { deckId } }),
          apiClient.listDeckGroups({ params: { deckId } }),
          apiClient.listDeckSets({ params: { deckId } }),
          listPairsMap(),
          resolveDeckExportFaceIds(deckId),
        ]);
        const entriesBySet = await Promise.all(
          sets.map(async (set) => ({
            setId: set.id,
            entries: await apiClient.listDeckEntries({ params: { setId: set.id } }),
          })),
        );
        const allEntries = entriesBySet.flatMap((group) => group.entries);
        const uniquePairCount = new Set(allEntries.map((entry) => entry.pairId)).size;
        const quantityTotal = allEntries.reduce((sum, entry) => sum + (entry.count ?? 1), 0);
        const pairedNotInSet = new Set<string>();

        const pairsByBackFace = new Map<string, string[]>();
        pairMap.forEach((pair) => {
          if (!pair.backFaceId || !pair.frontFaceId) return;
          const list = pairsByBackFace.get(pair.backFaceId) ?? [];
          list.push(pair.frontFaceId);
          pairsByBackFace.set(pair.backFaceId, list);
        });

        entriesBySet.forEach(({ setId, entries }) => {
          const set = sets.find((item) => item.id === setId);
          if (!set) return;
          const pairedFronts = pairsByBackFace.get(set.backFaceId) ?? [];
          const presentFronts = new Set<string>();
          entries.forEach((entry) => {
            const frontId = pairMap.get(entry.pairId)?.frontFaceId;
            if (frontId) presentFronts.add(frontId);
          });
          pairedFronts.forEach((frontId) => {
            if (!presentFronts.has(frontId)) pairedNotInSet.add(frontId);
          });
        });

        if (cancelled) return;
        setMetaState({
          isLoading: false,
          error: false,
          createdAt: deck?.createdAt ?? null,
          updatedAt: deck?.updatedAt ?? null,
          groupCount: groups.length,
          setCount: sets.length,
          entryCount: allEntries.length,
          imageExport: imageExport,
          uniquePairCount,
          quantityTotal,
          pairedNotInSetCount: pairedNotInSet.size,
          deckPreviewCardIds: buildDeckPreviewCardIds({
            keySetId: deck?.keySetId ?? null,
            groups,
            sets,
          }),
        });
      } catch {
        if (cancelled) return;
        setMetaState((prev) => ({ ...prev, isLoading: false, error: true }));
      }
    };
    void loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [deckId, isMetaMode]);

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
          {!isMetaMode ? (
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
            <div className={styles.deckMetaPanel}>
              <div className={styles.deckFaceModeHeader}>
                <div className={styles.deckFaceModeTitle}>{t("decks.meta.title")}</div>
              </div>
              <div className={styles.deckMetaFanSection} data-testid="deck-meta-fan">
                <div className={styles.deckMetaFanInner}>
                  <span className={styles.deckBreadcrumbFan} aria-hidden="true">
                    <CardFan
                      cardIds={metaState.deckPreviewCardIds}
                      variant="lg"
                      maxCount={DEFAULT_DECK_FAN_PREVIEW_COUNT}
                      showPlaceholdersWhenEmpty
                      emptyPlaceholderVariant="deck-empty"
                      spacing={0.65}
                      tilt={0.55}
                    />
                  </span>
                </div>
              </div>
              <div className={styles.deckMetaDetailsSection}>
                {metaState.isLoading ? <div className={styles.inspectorModeEmpty}>{t("decks.meta.loading")}</div> : null}
                {!metaState.isLoading && metaState.error ? (
                  <div className={styles.inspectorModeEmpty}>{t("decks.meta.error")}</div>
                ) : null}
                {!metaState.isLoading && !metaState.error ? (
                  <>
                    <dl className={styles.assetsInspectorDetails}>
                      <div className={styles.uRowLg}>
                        <dt>{t("decks.meta.created")}</dt>
                        <dd>
                          {metaState.createdAt ? new Date(metaState.createdAt).toLocaleString() : t("label.unknownVersion")}
                        </dd>
                      </div>
                      <div className={styles.uRowLg}>
                        <dt>{t("decks.meta.modified")}</dt>
                        <dd>
                          {metaState.updatedAt ? new Date(metaState.updatedAt).toLocaleString() : t("label.unknownVersion")}
                        </dd>
                      </div>
                      <div className={styles.uRowLg}>
                        <dt>{t("decks.meta.groups")}</dt>
                        <dd>{metaState.groupCount}</dd>
                      </div>
                      <div className={styles.uRowLg}>
                        <dt>{t("decks.meta.sets")}</dt>
                        <dd>{metaState.setCount}</dd>
                      </div>
                      <div className={styles.uRowLg}>
                        <dt>{t("decks.meta.entries")}</dt>
                        <dd>{metaState.entryCount}</dd>
                      </div>
                    </dl>
                    <div className={styles.assetsInspectorUsage}>
                      <div className={styles.assetsInspectorSectionTitle}>{t("decks.meta.images.section")}</div>
                      <dl className={styles.assetsInspectorDetails}>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.images.totalUnique")}</dt>
                          <dd>{metaState.imageExport.totalCount}</dd>
                        </div>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.images.frontUnique")}</dt>
                          <dd>{metaState.imageExport.frontCount}</dd>
                        </div>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.images.backUnique")}</dt>
                          <dd>{metaState.imageExport.backCount}</dd>
                        </div>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.images.setSnapshot")}</dt>
                          <dd>{metaState.imageExport.setCount}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className={styles.assetsInspectorUsage}>
                      <div className={styles.assetsInspectorSectionTitle}>{t("decks.meta.pdf.section")}</div>
                      <dl className={styles.assetsInspectorDetails}>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.pdf.uniquePairs")}</dt>
                          <dd>{metaState.uniquePairCount}</dd>
                        </div>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.pdf.quantityTotal")}</dt>
                          <dd>{metaState.quantityTotal}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className={styles.assetsInspectorUsage}>
                      <div className={styles.assetsInspectorSectionTitle}>{t("decks.meta.health.section")}</div>
                      <dl className={styles.assetsInspectorDetails}>
                        <div className={styles.uRowLg}>
                          <dt>{t("decks.meta.health.pairedMissing")}</dt>
                          <dd>{metaState.pairedNotInSetCount}</dd>
                        </div>
                      </dl>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
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
