"use client";

import { PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import type { CollectionRecord } from "@/api/collections";
import type { DeckEntryRecord, DeckGroupRecord, DeckRecord, DeckSetRecord } from "@/api/decks";
import type { PairRecord } from "@/api/pairs";
import styles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { CARD_FAN_SIZES } from "@/components/Decks/CardFan";
import DecksGridPanel from "@/components/Decks/DecksGridPanel";
import DeckDetailPanel from "@/components/Decks/DeckDetailPanel";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import formatMessageWith from "@/lib/format-message-with";

import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";

const SET_TILE_VARIANT = "smMd";
const GROUP_TILE_VARIANT = "smMd";
const DECK_PREVIEW_FAN_COUNT = 5;
const BACK_PANEL_TILE_VARIANT = "sm";

function DeckEntryThumb({ cardId, isSelected }: { cardId: string; isSelected: boolean }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <div className={`${styles.deckEntryThumb} ${isSelected ? styles.deckEntryThumbSelected : ""}`}>
      <CardThumbnail
        src={thumbUrl}
        alt=""
        variant={SET_TILE_VARIANT}
        fit="cover"
        className={styles.deckEntryThumbFrame}
        fallback={<div className={styles.deckPreviewThumbFallback} />}
      />
    </div>
  );
}

function DeckSetThumb({ cardId }: { cardId: string }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={SET_TILE_VARIANT}
      fit="cover"
      className={styles.deckSetThumb}
      fallback={<div className={styles.deckSetThumbFallback} />}
    />
  );
}

function BackPanelThumb({ cardId }: { cardId: string }) {
  const thumbUrl = useCardThumbnailUrl(cardId, null, { enabled: true, useCache: true });
  return (
    <CardThumbnail
      src={thumbUrl}
      alt=""
      variant={BACK_PANEL_TILE_VARIANT}
      fit="cover"
      className={styles.deckSetThumb}
      fallback={<div className={styles.deckSetThumbFallback} />}
    />
  );
}

function BackPanelDraggableThumb({ cardId }: { cardId: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `back:${cardId}`,
    data: { type: "back-face", backFaceId: cardId },
  });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckBacksThumb} ${isDragging ? styles.deckBacksThumbDragging : ""}`}
      style={{ touchAction: "none" }}
      {...attributes}
      {...listeners}
    >
      <BackPanelThumb cardId={cardId} />
    </div>
  );
}

type BackFilter =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
  | { type: "recentlyDeleted" }
  | { type: "collection"; id: string };

function DeckBacksPanel({
  collections,
  cards,
  emptyLabel,
  activeFilter,
  onFilterChange,
}: {
  collections: CollectionRecord[];
  cards: CardRecord[];
  emptyLabel: string;
  activeFilter: BackFilter;
  onFilterChange: (next: BackFilter) => void;
}) {
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
    cards,
    collections,
    search: "",
    templateFilter: "back",
    activeFilter,
    isPairMode: true,
    isPairBacks: true,
    showUnpairedOnly: false,
    showMissingArtworkOnly: false,
  });

  const visibleCollections = collections.filter((collection) =>
    visibleCollectionIds.has(collection.id),
  );

  return (
    <div className={styles.deckBacksPanel}>
      <div className={styles.deckBacksToolbar}>Back faces</div>
      <div className={styles.deckBacksFilter}>
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
      </div>
      <div className={styles.deckBacksGridPanel}>
        {filteredCards.length === 0 ? (
          <div className={styles.decksEmpty}>{emptyLabel}</div>
        ) : (
          <div className={styles.deckBacksGrid}>
            {filteredCards.map((card) => (
              <BackPanelDraggableThumb key={card.id} cardId={card.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeckSetTile({
  set,
  isSelected,
  onSelect,
}: {
  set: DeckSetRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: set.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      className={`${styles.deckSetTile} ${isSelected ? styles.deckSetTileSelected : ""} ${
        isDragging ? styles.deckSetTileDragging : ""
      }`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <DeckSetThumb cardId={set.backFaceId} />
    </button>
  );
}

function DeckSetDropPlaceholder({ cardId }: { cardId?: string | null }) {
  return (
    <div className={styles.deckSetTileDropPlaceholder}>
      {cardId ? (
        <div className={styles.deckSetTileDropGhost}>
          <DeckSetThumb cardId={cardId} />
        </div>
      ) : null}
    </div>
  );
}

function GroupDroppableRow({ groupId, children }: { groupId: string; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `group:${groupId}` });
  const tileSize = CARD_FAN_SIZES[SET_TILE_VARIANT];
  return (
    <div
      className={styles.deckSetsRow}
      ref={setNodeRef}
      style={{
        ["--deck-set-w" as string]: `${tileSize.width}px`,
        ["--deck-set-h" as string]: `${tileSize.height}px`,
      }}
    >
      {children}
    </div>
  );
}

export default function DecksRoutePanels() {
  const { t } = useI18n();
  const formatMessage = useMemo(
    () => (key: string, vars: Record<string, string | number>) =>
      formatMessageWith(t as never, key as never, vars),
    [t],
  );
  const navigate = useNavigate();
  const { deckId } = useParams();
  const { openStockpile } = useAppActions();

  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [deckPreviews, setDeckPreviews] = useState<Record<string, string[]>>({});
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set());
  const [isDeleteDeckOpen, setIsDeleteDeckOpen] = useState(false);
  const [isDeleteSetOpen, setIsDeleteSetOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<DeckGroupRecord | null>(null);
  const [pendingDeleteSet, setPendingDeleteSet] = useState<DeckSetRecord | null>(null);

  const [activeDeck, setActiveDeck] = useState<DeckRecord | null>(null);
  const [groups, setGroups] = useState<DeckGroupRecord[]>([]);
  const [sets, setSets] = useState<DeckSetRecord[]>([]);
  const [entries, setEntries] = useState<DeckEntryRecord[]>([]);
  const [pairsById, setPairsById] = useState<Map<string, PairRecord>>(new Map());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [deckTitleDraft, setDeckTitleDraft] = useState("");
  const [deckDescriptionDraft, setDeckDescriptionDraft] = useState("");
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [setTitleDraft, setSetTitleDraft] = useState("");
  const [setDescriptionDraft, setSetDescriptionDraft] = useState("");
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [backCollections, setBackCollections] = useState<CollectionRecord[]>([]);
  const [backCards, setBackCards] = useState<CardRecord[]>([]);
  const [backFilter, setBackFilter] = useState<BackFilter>({ type: "all" });
  const [isGroupDropOver, setIsGroupDropOver] = useState(false);
  const [backCard, setBackCard] = useState<CardRecord | null>(null);
  const [isRebuildConfirmOpen, setIsRebuildConfirmOpen] = useState(false);
  const [pendingRebuildSetId, setPendingRebuildSetId] = useState<string | null>(null);
  const [dragActiveSetId, setDragActiveSetId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const isDeckDetail = Boolean(deckId);

  const selectedDeckId = useMemo(() => {
    if (selectedDeckIds.size === 1) {
      return Array.from(selectedDeckIds)[0];
    }
    return null;
  }, [selectedDeckIds]);

  const selectedGroup = useMemo(
    () => (selectedGroupId ? (groups.find((group) => group.id === selectedGroupId) ?? null) : null),
    [groups, selectedGroupId],
  );

  const selectedSet = useMemo(
    () => (activeSetId ? (sets.find((set) => set.id === activeSetId) ?? null) : null),
    [activeSetId, sets],
  );

  const selectedEntryFrontIds = useMemo(() => {
    const ids: string[] = [];
    entries.forEach((entry) => {
      if (!selectedEntryIds.has(entry.id)) return;
      const pair = pairsById.get(entry.pairId);
      if (pair?.frontFaceId) ids.push(pair.frontFaceId);
    });
    return ids;
  }, [entries, pairsById, selectedEntryIds]);

  const setById = useMemo(() => new Map(sets.map((set) => [set.id, set])), [sets]);
  const groupBySetId = useMemo(() => {
    const map = new Map<string, string>();
    sets.forEach((set) => map.set(set.id, set.groupId));
    return map;
  }, [sets]);
  const orderedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sortIndex - b.sortIndex),
    [groups],
  );
  const selectedGroupSets = useMemo(() => {
    if (!selectedGroupId) return [];
    return sets
      .filter((set) => set.groupId === selectedGroupId)
      .sort((a, b) => a.sortIndex - b.sortIndex);
  }, [sets, selectedGroupId]);

  const isDecksIndex = !isDeckDetail;

  const fetchDecks = async () => {
    const data = await apiClient.listDecks({ queries: {} });
    setDecks(data);
    return data;
  };

  const buildDeckPreview = async (deck: DeckRecord, pairMap: Map<string, PairRecord>) => {
    const groupsData = await apiClient.listDeckGroups({ params: { deckId: deck.id } });
    const setsData = await apiClient.listDeckSets({ params: { deckId: deck.id } });
    const setsByGroup = new Map<string, DeckSetRecord[]>();
    setsData.forEach((set) => {
      const list = setsByGroup.get(set.groupId) ?? [];
      list.push(set);
      setsByGroup.set(set.groupId, list);
    });
    setsByGroup.forEach((list, key) => {
      list.sort((a, b) => a.sortIndex - b.sortIndex);
      setsByGroup.set(key, list);
    });

    const orderedGroups = [...groupsData].sort((a, b) => a.sortIndex - b.sortIndex);
    const previewIds: string[] = [];
    const seen = new Set<string>();

    for (const group of orderedGroups) {
      const groupSets = setsByGroup.get(group.id) ?? [];
      for (const set of groupSets) {
        if (!seen.has(set.backFaceId)) {
          previewIds.push(set.backFaceId);
          seen.add(set.backFaceId);
        }
        if (previewIds.length >= DECK_PREVIEW_FAN_COUNT) break;
      }
      if (previewIds.length >= DECK_PREVIEW_FAN_COUNT) break;
    }

    for (const group of orderedGroups) {
      const groupSets = setsByGroup.get(group.id) ?? [];
      for (const set of groupSets) {
        const setEntries = await apiClient.listDeckEntries({ params: { setId: set.id } });
        const orderedEntries = [...setEntries].sort((a, b) => a.sortIndex - b.sortIndex);
        for (const entry of orderedEntries) {
          const pair = pairMap.get(entry.pairId);
          if (!pair?.frontFaceId) continue;
          if (seen.has(pair.frontFaceId)) continue;
          previewIds.push(pair.frontFaceId);
          seen.add(pair.frontFaceId);
          if (previewIds.length >= DECK_PREVIEW_FAN_COUNT) break;
        }
        if (previewIds.length >= DECK_PREVIEW_FAN_COUNT) break;
      }
      if (previewIds.length >= DECK_PREVIEW_FAN_COUNT) break;
    }

    return previewIds.slice(0, DECK_PREVIEW_FAN_COUNT);
  };

  const refreshDeckPreviews = async (deckList: DeckRecord[]) => {
    const pairs = await apiClient.listPairs();
    const pairMap = new Map<string, PairRecord>();
    pairs.forEach((pair) => pairMap.set(pair.id, pair));

    const nextPreviews: Record<string, string[]> = {};
    for (const deck of deckList) {
      nextPreviews[deck.id] = await buildDeckPreview(deck, pairMap);
    }
    setDeckPreviews(nextPreviews);
  };

  useEffect(() => {
    if (!isDecksIndex) return;
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
    let active = true;
    fetchDecks()
      .then((list) => {
        if (!active) return;
        void refreshDeckPreviews(list);
      })
      .catch(() => {
        if (!active) return;
        setDecks([]);
      });
    return () => {
      active = false;
    };
  }, [isDecksIndex]);

  const loadDeckDetail = async (id: string, preferredSetId?: string | null) => {
    const [deck, groupData, setData, pairData] = await Promise.all([
      apiClient.getDeck({ params: { deckId: id } }),
      apiClient.listDeckGroups({ params: { deckId: id } }),
      apiClient.listDeckSets({ params: { deckId: id } }),
      apiClient.listPairs(),
    ]);
    setActiveDeck(deck);
    setGroups(groupData);
    setSets(setData);
    const pairMap = new Map<string, PairRecord>();
    pairData.forEach((pair) => pairMap.set(pair.id, pair));
    setPairsById(pairMap);
    setDeckTitleDraft(deck?.title ?? "");
    setDeckDescriptionDraft(deck?.description ?? "");

    const orderedGroups = [...groupData].sort((a, b) => a.sortIndex - b.sortIndex);
    const groupById = new Map(groupData.map((group) => [group.id, group]));
    const getFirstSetId = (groupId: string | null) => {
      if (!groupId) return null;
      const groupSets = setData
        .filter((set) => set.groupId === groupId)
        .sort((a, b) => a.sortIndex - b.sortIndex);
      return groupSets[0]?.id ?? null;
    };

    const preferredSet = preferredSetId
      ? (setData.find((set) => set.id === preferredSetId) ?? null)
      : null;
    const nextSelectedGroupId =
      preferredSet?.groupId ??
      (selectedGroupId && groupById.has(selectedGroupId) ? selectedGroupId : null) ??
      orderedGroups[0]?.id ??
      null;
    const nextGroupSets = nextSelectedGroupId
      ? setData
          .filter((set) => set.groupId === nextSelectedGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
      : [];
    const nextSelectedSetId =
      preferredSet?.id ??
      (nextGroupSets.length === 1
        ? (nextGroupSets[0]?.id ?? null)
        : selectedSetId &&
            nextSelectedGroupId &&
            setData.some((set) => set.id === selectedSetId && set.groupId === nextSelectedGroupId)
          ? selectedSetId
          : null);
    setSelectedGroupId(nextSelectedGroupId);
    setSelectedSetId(nextSelectedSetId);
    setActiveSetId(nextSelectedSetId);
  };

  useEffect(() => {
    if (!deckId) return;
    let active = true;
    loadDeckDetail(deckId).catch(() => {
      if (!active) return;
      setActiveDeck(null);
      setGroups([]);
      setSets([]);
      setEntries([]);
    });
    return () => {
      active = false;
    };
  }, [deckId]);

  useEffect(() => {
    if (!selectedSetId) {
      setEntries([]);
      setSelectedEntryIds(new Set());
      return;
    }
    let active = true;
    apiClient
      .listDeckEntries({ params: { setId: selectedSetId } })
      .then((data) => {
        if (!active) return;
        setEntries(data);
        setSelectedEntryIds(new Set());
      })
      .catch(() => {
        if (!active) return;
        setEntries([]);
      });
    return () => {
      active = false;
    };
  }, [selectedSetId]);

  useEffect(() => {
    if (!isRightPanelVisible) return;
    let active = true;
    Promise.all([apiClient.listCollections(), apiClient.listCards()])
      .then(([collections, cards]) => {
        if (!active) return;
        setBackCards(cards);
        setBackCollections(collections);
      })
      .catch(() => {
        if (!active) return;
        setBackCollections([]);
        setBackCards([]);
      });
    return () => {
      active = false;
    };
  }, [isRightPanelVisible]);

  useEffect(() => {
    if (!activeSetId) {
      setBackCard(null);
      setSetTitleDraft("");
      setSetDescriptionDraft("");
      return;
    }
    let active = true;
    const set = sets.find((candidate) => candidate.id === activeSetId) ?? null;
    if (set) {
      setSetTitleDraft(set.title);
      setSetDescriptionDraft(set.description ?? "");
      apiClient
        .getCard({ params: { id: set.backFaceId } })
        .then((card) => {
          if (!active) return;
          setBackCard(card ?? null);
        })
        .catch(() => {
          if (!active) return;
          setBackCard(null);
        });
    }
    return () => {
      active = false;
    };
  }, [activeSetId, sets]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupTitleDraft("");
      return;
    }
    const group = groups.find((candidate) => candidate.id === selectedGroupId) ?? null;
    if (!group) {
      setGroupTitleDraft("");
      return;
    }
    setGroupTitleDraft(group.title);
  }, [groups, selectedGroupId]);

  const handleCreateDeck = async (title: string, description: string) => {
    const trimmed = title.trim();
    const nextTitle = trimmed || t("decks.untitledDeck");
    const created = await apiClient.createDeck({
      title: nextTitle,
      description: description || null,
    });
    const nextDecks = await fetchDecks();
    await refreshDeckPreviews(nextDecks);
    setSelectedDeckIds(new Set([created.id]));
    setDeckTitleDraft("");
    setDeckDescriptionDraft("");
  };

  const handleDeleteDecks = async () => {
    const ids = Array.from(selectedDeckIds);
    await Promise.all(ids.map((id) => apiClient.deleteDeck(undefined, { params: { deckId: id } })));
    setSelectedDeckIds(new Set());
    const nextDecks = await fetchDecks();
    await refreshDeckPreviews(nextDecks);
  };

  const handleDuplicateDeck = async (id: string) => {
    const result = await apiClient.duplicateDeck(undefined, { params: { deckId: id } });
    const nextDecks = await fetchDecks();
    await refreshDeckPreviews(nextDecks);
    if (result?.id) {
      navigate(`/decks/${result.id}`);
    }
  };

  const handleCreateGroup = async () => {
    if (!deckId) return;
    const created = await apiClient.createDeckGroup(
      { title: t("decks.defaultGroupTitle") },
      { params: { deckId } },
    );
    await loadDeckDetail(deckId);
    setSelectedGroupId(created.id);
    setSelectedSetId(null);
    setActiveSetId(null);
  };

  const handleCreateSet = async (group: DeckGroupRecord) => {
    if (!deckId) return;
    openStockpile({
      mode: "pair-backs",
      titleOverride: formatMessage("decks.chooseBackTitle", {
        title: t("decks.defaultSetTitle"),
      }),
      onConfirmSelection: async (cardIds) => {
        const backFaceId = cardIds[0];
        if (!backFaceId) return;
        const createdSet = await apiClient.createDeckSet({
          deckId,
          groupId: group.id,
          title: t("decks.defaultSetTitle"),
          backFaceId,
          description: null,
        });
        const pairedFrontIds = (await apiClient.listPairs({ queries: { faceId: backFaceId } }))
          .filter((pair) => pair.backFaceId === backFaceId && pair.frontFaceId)
          .map((pair) => pair.frontFaceId as string);
        if (pairedFrontIds.length > 0) {
          await apiClient.addDeckEntries(
            { frontFaceIds: pairedFrontIds },
            { params: { setId: createdSet.id } },
          );
        }
        await loadDeckDetail(deckId, createdSet.id);
      },
    });
  };

  const handleAddCardsToSet = async (set: DeckSetRecord) => {
    openStockpile({
      mode: "pair-fronts",
      titleOverride: formatMessage("decks.addCardsTitle", { title: set.title }),
      onConfirmSelection: async (cardIds) => {
        await apiClient.addDeckEntries({ frontFaceIds: cardIds }, { params: { setId: set.id } });
        const nextEntries = await apiClient.listDeckEntries({ params: { setId: set.id } });
        if (selectedSetId === set.id) {
          setEntries(nextEntries);
          setSelectedEntryIds(new Set());
        }
        const pairData = await apiClient.listPairs();
        const pairMap = new Map<string, PairRecord>();
        pairData.forEach((pair) => pairMap.set(pair.id, pair));
        setPairsById(pairMap);
      },
    });
  };

  const handleChangeBack = (set: DeckSetRecord) => {
    setPendingRebuildSetId(set.id);
    setIsRebuildConfirmOpen(true);
  };

  const startRebuildFlow = () => {
    const setId = pendingRebuildSetId;
    if (!setId) return;
    setIsRebuildConfirmOpen(false);
    const currentSet = sets.find((set) => set.id === setId);
    if (!currentSet) return;

    openStockpile({
      mode: "pair-backs",
      titleOverride: formatMessage("decks.changeBackTitle", { title: currentSet.title }),
      onConfirmSelection: (backIds) => {
        const newBackFaceId = backIds[0];
        if (!newBackFaceId) return;
        openStockpile({
          mode: "pair-fronts",
          titleOverride: formatMessage("decks.rebuildSelectFronts", { title: currentSet.title }),
          onConfirmSelection: async (frontIds) => {
            await apiClient.rebuildDeckSetBack(
              { newBackFaceId, frontFaceIds: frontIds },
              { params: { setId: currentSet.id } },
            );
            await loadDeckDetail(currentSet.deckId);
          },
        });
      },
    });
  };

  const handleDeleteSet = async () => {
    if (!pendingDeleteSet) return;
    await apiClient.deleteDeckSet(undefined, { params: { setId: pendingDeleteSet.id } });
    setPendingDeleteSet(null);
    setIsDeleteSetOpen(false);
    if (deckId) {
      await loadDeckDetail(deckId);
    }
  };

  const handleDeleteGroup = async () => {
    if (!pendingDeleteGroup) return;
    await apiClient.deleteDeckGroup(undefined, { params: { groupId: pendingDeleteGroup.id } });
    setPendingDeleteGroup(null);
    setIsDeleteGroupOpen(false);
    if (deckId) {
      await loadDeckDetail(deckId);
    }
  };

  const handleRemoveEntries = async (setId: string) => {
    if (selectedEntryIds.size === 0) return;
    await apiClient.removeDeckEntries(
      { entryIds: Array.from(selectedEntryIds) },
      { params: { setId } },
    );
    const nextEntries = await apiClient.listDeckEntries({ params: { setId } });
    setEntries(nextEntries);
    setSelectedEntryIds(new Set());
  };

  const handleMoveGroup = async (groupId: string, direction: "up" | "down") => {
    if (!deckId) return;
    const ordered = [...groups].sort((a, b) => a.sortIndex - b.sortIndex).map((g) => g.id);
    const index = ordered.indexOf(groupId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await apiClient.reorderDeckGroups({ orderedGroupIds: next }, { params: { deckId } });
    await loadDeckDetail(deckId);
  };

  const handleMoveSet = async (setId: string, direction: "up" | "down") => {
    const set = sets.find((candidate) => candidate.id === setId);
    if (!set) return;
    const groupSets = sets
      .filter((candidate) => candidate.groupId === set.groupId)
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((candidate) => candidate.id);
    const index = groupSets.indexOf(setId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= groupSets.length) return;
    const next = [...groupSets];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await apiClient.reorderDeckSets({ orderedSetIds: next }, { params: { setId } });
    if (deckId) {
      await loadDeckDetail(deckId);
    }
  };

  const handleSetDragStart = ({ active }: DragStartEvent) => {
    const activeType = active.data?.current?.type;
    if (activeType === "back-face") return;
    setDragActiveSetId(String(active.id));
  };

  const handleSetDragOver = ({ over, active }: DragOverEvent) => {
    const overId = over ? String(over.id) : null;
    const activeType = active.data?.current?.type;
    setDragOverId(overId);
    setIsGroupDropOver(Boolean(overId && (overId === "groups-empty" || overId === "groups-area")));
    if (activeType !== "back-face" && overId?.startsWith("group:")) {
      const groupId = overId.replace("group:", "");
      if (groupId && groupId !== selectedGroupId) {
        setSelectedGroupId(groupId);
      }
    }
  };

  const handleSetDragEnd = async ({ active, over }: DragEndEvent) => {
    const activeType = active.data?.current?.type;
    const backFaceId = active.data?.current?.backFaceId as string | undefined;
    setDragActiveSetId(null);
    setDragOverId(null);
    setIsGroupDropOver(false);
    if (activeType === "back-face") {
      if (!over || !deckId || !backFaceId) return;
      const overId = String(over.id);
      const targetGroupId = overId.startsWith("group:") ? overId.replace("group:", "") : null;
      if (targetGroupId) {
        await createSetFromBackFace(deckId, targetGroupId, backFaceId);
        return;
      }
      if (overId === "groups-empty" || overId === "groups-area") {
        const group = await apiClient.createDeckGroup(
          { title: t("decks.defaultGroupTitle") },
          { params: { deckId } },
        );
        await createSetFromBackFace(deckId, group.id, backFaceId);
      }
      return;
    }
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const sourceGroupId = groupBySetId.get(activeId);
    if (!sourceGroupId) return;
    const targetGroupId = overId.startsWith("group:")
      ? overId.replace("group:", "")
      : groupBySetId.get(overId);
    if (!targetGroupId) return;

    const sourceOrdered = sets
      .filter((set) => set.groupId === sourceGroupId)
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((set) => set.id);
    const targetOrdered =
      sourceGroupId === targetGroupId
        ? sourceOrdered
        : sets
            .filter((set) => set.groupId === targetGroupId)
            .sort((a, b) => a.sortIndex - b.sortIndex)
            .map((set) => set.id);

    const fromIndex = sourceOrdered.indexOf(activeId);
    if (fromIndex < 0) return;
    const nextSource = [...sourceOrdered];
    nextSource.splice(fromIndex, 1);

    const toIndex =
      sourceGroupId === targetGroupId
        ? Math.max(0, targetOrdered.indexOf(overId))
        : overId.startsWith("group:")
          ? targetOrdered.length
          : Math.max(0, targetOrdered.indexOf(overId));
    const nextTarget = sourceGroupId === targetGroupId ? nextSource : [...targetOrdered];
    if (sourceGroupId === targetGroupId) {
      nextTarget.splice(toIndex, 0, activeId);
    } else {
      nextTarget.splice(toIndex, 0, activeId);
    }

    const sourceSortIndexMap = new Map(nextSource.map((id, index) => [id, index]));
    const targetSortIndexMap = new Map(nextTarget.map((id, index) => [id, index]));

    setSets((prev) =>
      prev.map((set) => {
        if (set.id === activeId) {
          return {
            ...set,
            groupId: targetGroupId,
            sortIndex: targetSortIndexMap.get(set.id) ?? set.sortIndex,
          };
        }
        if (set.groupId === sourceGroupId && sourceSortIndexMap.has(set.id)) {
          return { ...set, sortIndex: sourceSortIndexMap.get(set.id) ?? set.sortIndex };
        }
        if (set.groupId === targetGroupId && targetSortIndexMap.has(set.id)) {
          return { ...set, sortIndex: targetSortIndexMap.get(set.id) ?? set.sortIndex };
        }
        return set;
      }),
    );
    try {
      if (sourceGroupId !== targetGroupId) {
        await apiClient.updateDeckSet({ groupId: targetGroupId }, { params: { setId: activeId } });
      }
      if (sourceGroupId === targetGroupId) {
        await apiClient.reorderDeckSets(
          { orderedSetIds: nextTarget },
          { params: { setId: activeId } },
        );
      } else {
        await apiClient.reorderDeckSets(
          { orderedSetIds: nextTarget },
          { params: { setId: activeId } },
        );
        if (nextSource.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: nextSource },
            { params: { setId: nextSource[0] } },
          );
        }
      }
      if (activeId === selectedSetId && sourceGroupId !== targetGroupId) {
        setSelectedGroupId(targetGroupId);
      }
    } catch (error) {
      if (deckId) {
        await loadDeckDetail(deckId, activeSetId);
      }
      throw error;
    }
  };

  const handleMoveEntry = async (setId: string, entryId: string, direction: "up" | "down") => {
    if (!entries.length) return;
    const ordered = [...entries].sort((a, b) => a.sortIndex - b.sortIndex).map((entry) => entry.id);
    const index = ordered.indexOf(entryId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await apiClient.reorderDeckEntries({ orderedEntryIds: next }, { params: { setId } });
    const nextEntries = await apiClient.listDeckEntries({ params: { setId } });
    setEntries(nextEntries);
  };

  const resolveDropTarget = (
    activeId: string | null,
    overId: string | null,
    groupId: string,
    groupSets: DeckSetRecord[],
  ) => {
    if (!activeId || !overId) return null;
    const sourceGroupId = groupBySetId.get(activeId);
    const targetGroupId = overId.startsWith("group:")
      ? overId.replace("group:", "")
      : groupBySetId.get(overId);
    if (!targetGroupId || targetGroupId !== groupId) return null;
    if (sourceGroupId === targetGroupId) return null;
    const filtered = groupSets.filter((set) => set.id !== activeId);
    const index = overId.startsWith("group:")
      ? filtered.length
      : Math.max(
          0,
          filtered.findIndex((set) => set.id === overId),
        );
    return { index, filtered };
  };

  const getFirstSetIdForGroup = (groupId: string | null) => {
    if (!groupId) return null;
    const groupSets = sets
      .filter((set) => set.groupId === groupId)
      .sort((a, b) => a.sortIndex - b.sortIndex);
    return groupSets[0]?.id ?? null;
  };

  const handleSelectGroup = (groupId: string) => {
    const groupSets = sets
      .filter((set) => set.groupId === groupId)
      .sort((a, b) => a.sortIndex - b.sortIndex);
    const nextSetId = groupSets.length === 1 ? groupSets[0].id : null;
    setSelectedGroupId(groupId);
    setSelectedSetId(nextSetId);
    setActiveSetId(nextSetId);
  };

  const handleSelectSet = (set: DeckSetRecord) => {
    setSelectedGroupId(set.groupId);
    setSelectedSetId(set.id);
    setActiveSetId(set.id);
  };

  const createSetFromBackFace = async (
    deckIdValue: string,
    groupId: string,
    backFaceId: string,
  ) => {
    const createdSet = await apiClient.createDeckSet({
      deckId: deckIdValue,
      groupId,
      title: t("decks.defaultSetTitle"),
      backFaceId,
      description: null,
    });
    const pairedFrontIds = (await apiClient.listPairs({ queries: { faceId: backFaceId } }))
      .filter((pair) => pair.backFaceId === backFaceId && pair.frontFaceId)
      .map((pair) => pair.frontFaceId as string);
    if (pairedFrontIds.length > 0) {
      await apiClient.addDeckEntries(
        { frontFaceIds: pairedFrontIds },
        { params: { setId: createdSet.id } },
      );
    }
    await loadDeckDetail(deckIdValue, createdSet.id);
  };

  const handleSaveDeckMeta = async () => {
    if (!deckId) return;
    await apiClient.updateDeck(
      {
        title: deckTitleDraft.trim() || t("decks.untitledDeck"),
        description: deckDescriptionDraft || null,
      },
      { params: { deckId } },
    );
    await loadDeckDetail(deckId);
  };

  const handleSaveSetMeta = async () => {
    if (!selectedSet) return;
    await apiClient.updateDeckSet(
      {
        title: setTitleDraft.trim() || t("decks.untitledSet"),
        description: setDescriptionDraft || null,
      },
      { params: { setId: selectedSet.id } },
    );
    if (deckId) {
      await loadDeckDetail(deckId);
    }
  };

  const handleSaveGroupMeta = async () => {
    if (!selectedGroup) return;
    await apiClient.updateDeckGroup(
      {
        title: groupTitleDraft.trim() || t("decks.defaultGroupTitle"),
      },
      { params: { groupId: selectedGroup.id } },
    );
    if (deckId) {
      await loadDeckDetail(deckId, selectedSetId);
    }
  };

  if (isDecksIndex) {
    return (
      <>
        <DecksGridPanel
          t={t}
          decks={decks}
          deckPreviews={deckPreviews}
          selectedDeckIds={selectedDeckIds}
          selectedDeckId={selectedDeckId}
          selectedDeckIdsCount={selectedDeckIds.size}
          onSelectDeck={(deckId, hasModifier) => {
            setSelectedDeckIds((prev) => {
              if (hasModifier) {
                const next = new Set(prev);
                if (next.has(deckId)) next.delete(deckId);
                else next.add(deckId);
                return next;
              }
              if (prev.size === 1 && prev.has(deckId)) {
                return new Set();
              }
              return new Set([deckId]);
            });
          }}
          onOpenDeck={(deckId) => navigate(`/decks/${deckId}`)}
          onOpenSelected={() => selectedDeckId && navigate(`/decks/${selectedDeckId}`)}
          onDuplicateSelected={() => selectedDeckId && handleDuplicateDeck(selectedDeckId)}
          onDeleteSelected={() => setIsDeleteDeckOpen(true)}
          onCreateDeck={() => handleCreateDeck(deckTitleDraft, deckDescriptionDraft)}
          deckTitleDraft={deckTitleDraft}
          deckDescriptionDraft={deckDescriptionDraft}
          setDeckTitleDraft={setDeckTitleDraft}
          setDeckDescriptionDraft={setDeckDescriptionDraft}
          deckPreviewFanCount={DECK_PREVIEW_FAN_COUNT}
          previewVariant={SET_TILE_VARIANT}
        />
        <ConfirmModal
          isOpen={isDeleteDeckOpen}
          title={t("decks.deleteDeckTitle")}
          confirmLabel={t("actions.delete")}
          cancelLabel={t("actions.cancel")}
          onConfirm={async () => {
            setIsDeleteDeckOpen(false);
            await handleDeleteDecks();
          }}
          onCancel={() => setIsDeleteDeckOpen(false)}
        >
          <div>{t("decks.deleteDeckBody")}</div>
        </ConfirmModal>
      </>
    );
  }

  return (
    <DeckDetailPanel
      t={t}
      deckId={deckId ?? null}
      activeDeck={activeDeck}
      orderedGroups={orderedGroups}
      sets={sets}
      selectedGroupId={selectedGroupId}
      selectedGroup={selectedGroup}
      selectedGroupSets={selectedGroupSets}
      selectedSetId={selectedSetId}
      entries={entries}
      pairsById={pairsById}
      selectedEntryIds={selectedEntryIds}
      setSelectedEntryIds={setSelectedEntryIds}
      setEntries={setEntries}
      onSelectGroup={handleSelectGroup}
      onSelectSet={handleSelectSet}
      setIsDeleteDeckOpen={setIsDeleteDeckOpen}
      setIsDeleteSetOpen={setIsDeleteSetOpen}
      setIsDeleteGroupOpen={setIsDeleteGroupOpen}
      setPendingDeleteSet={setPendingDeleteSet}
      setPendingDeleteGroup={setPendingDeleteGroup}
      setIsRebuildConfirmOpen={setIsRebuildConfirmOpen}
      setPendingRebuildSetId={setPendingRebuildSetId}
      isDeleteDeckOpen={isDeleteDeckOpen}
      isDeleteSetOpen={isDeleteSetOpen}
      isDeleteGroupOpen={isDeleteGroupOpen}
      isRebuildConfirmOpen={isRebuildConfirmOpen}
      pendingRebuildSetId={pendingRebuildSetId}
      dragActiveSetId={dragActiveSetId}
      setDragActiveSetId={setDragActiveSetId}
      setDragOverId={setDragOverId}
      setIsGroupDropOver={setIsGroupDropOver}
      isGroupDropOver={isGroupDropOver}
      isRightPanelVisible={isRightPanelVisible}
      setIsRightPanelVisible={setIsRightPanelVisible}
      sensors={sensors}
      handleSetDragStart={handleSetDragStart}
      handleSetDragOver={handleSetDragOver}
      handleSetDragEnd={handleSetDragEnd}
      handleDuplicateDeck={handleDuplicateDeck}
      handleDeleteSet={handleDeleteSet}
      handleDeleteGroup={handleDeleteGroup}
      startRebuildFlow={startRebuildFlow}
      navigateToDecks={() => navigate("/decks")}
      onOpenCardEditor={(cardId) => navigate(`/cards/${cardId}`)}
      deckPreviewVariant={SET_TILE_VARIANT}
      groupTileVariant={GROUP_TILE_VARIANT}
      deckPreviewFanCount={DECK_PREVIEW_FAN_COUNT}
      setById={setById}
      deckEntryThumb={(cardId, isSelected) => <DeckEntryThumb cardId={cardId} isSelected={isSelected} />}
      removeEntry={async (entryId, setId) => {
        await apiClient.removeDeckEntries({ entryIds: [entryId] }, { params: { setId } });
        const nextEntries = await apiClient.listDeckEntries({ params: { setId } });
        setEntries(nextEntries);
      }}
      deleteDeck={(id) => apiClient.deleteDeck(undefined, { params: { deckId: id } })}
      deckSetTile={(set, isSelected, onSelect) => (
        <DeckSetTile set={set} isSelected={isSelected} onSelect={onSelect} />
      )}
      deckSetThumb={(cardId) => <DeckSetThumb cardId={cardId} />}
      backCardsByCollection={
        <DeckBacksPanel
          collections={backCollections}
          cards={backCards}
          emptyLabel={t("empty.noBackCards")}
          activeFilter={backFilter}
          onFilterChange={(next) => setBackFilter(next)}
        />
      }
    />
  );
}
