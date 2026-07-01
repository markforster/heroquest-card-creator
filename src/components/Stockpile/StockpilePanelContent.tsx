"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { ChevronLeft, ChevronRight, FolderPlus, Pencil, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import type { CardRecord } from "@/api/cards";
import { apiClient } from "@/api/client";
import { invalidateCollectionsQueries } from "@/api/queryInvalidation";
import styles from "@/app/page.module.css";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import ModalShell from "@/components/common/ModalShell";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import { useBulkCardExport } from "@/components/Export/hooks/useBulkCardExport";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useEditorForm } from "@/components/Providers/EditorFormContext";
import { useLocalStorageBoolean } from "@/components/Providers/LocalStorageProvider";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";
import { getDeleteCollectionImpact } from "@/components/Stockpile/collection-delete-impact";
import { useStockpileData } from "@/components/Stockpile/hooks/useStockpileData";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import { mergeCollectionCardIds } from "@/components/Stockpile/stockpile-collections-merge";
import { resolveSingleSelectToggle } from "@/components/Stockpile/stockpile-selection";
import { hydrateCardsForExport } from "@/components/Stockpile/stockpile-export";
import { resolveExportFileName, resolveZipFileName } from "@/components/Stockpile/stockpile-utils";
import CollectionPdfExportSummaryModal from "@/components/Stockpile/pdf/CollectionPdfExportSummaryModal";
import StockpileActionsBar from "@/components/Stockpile/StockpileActionsBar";
import StockpileAddToCollectionController from "@/components/Stockpile/StockpileAddToCollectionController";
import StockpileCollectionModal from "@/components/Stockpile/StockpileCollectionModal";
import StockpileConfirmModal from "@/components/Stockpile/StockpileConfirmModal";
import StockpileContentPane from "@/components/Stockpile/StockpileContentPane";
import StockpileExportPairPrompt from "@/components/Stockpile/StockpileExportPairPrompt";
import StockpileFooter from "@/components/Stockpile/StockpileFooter";
import StockpileMissingAssetsModal from "@/components/Stockpile/StockpileMissingAssetsModal";
import StockpilePairPopover from "@/components/Stockpile/StockpilePairPopover";
import StockpileSidebar from "@/components/Stockpile/StockpileSidebar";
import StockpileTableThumbPopover from "@/components/Stockpile/StockpileTableThumbPopover";
import StockpileToolbar from "@/components/Stockpile/StockpileToolbar";
import type {
  StockpileCardActions,
  StockpileCardThumb,
  StockpileCardView,
} from "@/components/Stockpile/types";
import {
  ENABLE_CARD_THUMB_CACHE,
  ENABLE_STOCKPILE_COLLECTION_PDF_EXPORT,
} from "@/config/flags";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeFileProtocolAssetUrl } from "@/lib/browser";
import { resolveEffectiveFace } from "@/lib/card-face";
import {
  getCachedCardThumbnailUrl,
  getLegacyCardThumbnailUrl,
  releaseLegacyCardThumbnailUrl,
} from "@/lib/card-thumbnail-cache";
import {
  isCardDeleteConfirmRequiredError,
  isPairDeleteConfirmRequiredError,
  type CardDeleteUsageReport,
  type PairUsageReport,
} from "@/lib/decks-errors";
import { createEditorDefaultValues } from "@/lib/editor-form";
import type { MissingAssetReport } from "@/lib/export-assets-cache";
import formatMessageWith from "@/lib/format-message-with";
import { deletePairsForFaces } from "@/lib/pairs-service";
import type { TemplateId } from "@/types/templates";
import type { OpenCloseProps } from "@/types/ui";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";

type StockpilePanelMode = "manage" | "pair-fronts" | "pair-backs";

type StockpilePanelContentProps = OpenCloseProps & {
  onLoadCard?: (card: CardRecord) => void;
  refreshToken?: number;
  activeCardId?: string | null;
  mode?: StockpilePanelMode;
  onConfirmSelection?: (cardIds: string[]) => void;
  initialSelectedIds?: string[];
  titleOverride?: string;
  frame?: "panel" | "modal";
};

type MissingAssetsPrompt = {
  cards: CardRecord[];
  report: MissingAssetReport[];
  skipIds: Set<string>;
  skipNotes: Map<string, string>;
};

const STOCKPILE_VIEW_STORAGE_KEY = "hqcc.stockpileView";
const STOCKPILE_FILTERS_PANEL_OPEN_STORAGE_KEY = "hqcc.stockpile.filtersPanelOpen";

export default function StockpilePanelContent({
  isOpen,
  onClose,
  onLoadCard,
  refreshToken,
  activeCardId,
  mode = "manage",
  onConfirmSelection,
  initialSelectedIds,
  titleOverride,
  frame = "panel",
}: StockpilePanelContentProps) {
  const { t, language } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const isPairFronts = mode === "pair-fronts";
  const isPairBacks = mode === "pair-backs";
  const isPairMode = isPairFronts || isPairBacks;
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: ReactNode;
    confirmLabel?: string;
    extraLabel?: string;
    onConfirm: () => Promise<void> | void;
    onExtra?: () => Promise<void> | void;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [showUnpairedOnly, setShowUnpairedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isFiltersPanelOpen, setIsFiltersPanelOpen] = useLocalStorageBoolean(
    STOCKPILE_FILTERS_PANEL_OPEN_STORAGE_KEY,
    true,
  );
  const [isCollectionsDrawerOpen, setIsCollectionsDrawerOpen] = useState(false);
  const [isManagingCollections, setIsManagingCollections] = useState(false);
  const [collectionModalState, setCollectionModalState] = useState<{
    mode: "create" | "edit";
    collectionId: string | null;
  } | null>(null);
  const [deleteCollectionPrompt, setDeleteCollectionPrompt] = useState<{
    collectionId: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const [pairUsagePrompt, setPairUsagePrompt] = useState<PairUsageReport | null>(null);
  const [pairUsagePendingDeleteIds, setPairUsagePendingDeleteIds] = useState<string[]>([]);
  const [cardDeleteUsagePrompt, setCardDeleteUsagePrompt] = useState<CardDeleteUsageReport | null>(
    null,
  );
  const [cardDeletePendingIds, setCardDeletePendingIds] = useState<string[]>([]);
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [pairingBaselineIds, setPairingBaselineIds] = useState<string[]>([]);
  const [pairsByBackId, setPairsByBackId] = useState<Map<string, string[]>>(new Map());
  const [backByFrontId, setBackByFrontId] = useState<Map<string, string>>(new Map());
  const [activeFilter, setActiveFilter] = useState<
    | { type: "all" }
    | { type: "recent" }
    | { type: "unfiled" }
    | { type: "recentlyDeleted" }
    | { type: "collection"; id: string }
  >({ type: "all" });
  const dragEnabled = !isPairMode && activeFilter.type !== "recentlyDeleted";
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const {
    state: { activeCardIdByTemplate, selectedTemplateId },
    setActiveCard,
  } = useCardEditor();
  const { resetWithSaved } = useEditorForm();
  const { cards, setCards, isLoadingCards, collections, setCollections } = useStockpileData({
    isOpen,
    refreshToken,
    activeFilter,
    setActiveFilter,
  });
  const pairedIdSet = useMemo(() => {
    const paired = new Set<string>();
    backByFrontId.forEach((backId, frontId) => {
      paired.add(frontId);
      if (backId) {
        paired.add(backId);
      }
    });
    pairsByBackId.forEach((frontIds, backId) => {
      paired.add(backId);
      frontIds.forEach((frontId) => paired.add(frontId));
    });
    return paired;
  }, [backByFrontId, pairsByBackId]);
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<MissingAssetsPrompt | null>(null);
  const { missingArtworkIds } = useMissingAssets();
  const [showMissingArtworkOnly, setShowMissingArtworkOnly] = useState(false);
  const location = useLocation();
  const didAutoApplyMissingArtworkRef = useRef(false);
  const hasMissingArtworkParam = useMemo(() => {
    return new URLSearchParams(location.search).has("missingartwork");
  }, [location.search]);
  const {
    recentlyDeletedCount,
    recentlyDeletedTotalCount,
    recentCards,
    filteredCards,
    collectionCounts,
    unfiledCount,
    typeCounts,
    totalCount,
    faceCounts,
    visibleCollectionIds,
    eligibleIdSet,
    overallCount,
  } = useStockpileFilters({
    cards,
    collections,
    search,
    templateFilter,
    activeFilter,
    isPairMode,
    isPairBacks,
    showUnpairedOnly,
    pairedIdSet,
    showMissingArtworkOnly,
    missingArtworkIdSet: missingArtworkIds,
  });
  const exportFlow = useBulkCardExport();
  const [exportPairPrompt, setExportPairPrompt] = useState<{
    baseIds: string[];
    pairedIds: string[];
    exportLabel: string;
    exportOnlyLabel: string;
    previewRows: { left: CardRecord[]; right: CardRecord[] }[];
  } | null>(null);
  const [pendingCollectionPdfExport, setPendingCollectionPdfExport] = useState<{
    collectionName: string | null;
    faceIds: string[];
  } | null>(null);
  const [hoveredPairCardId, setHoveredPairCardId] = useState<string | null>(null);
  const pairHoverTimeoutRef = useRef<number | null>(null);
  const [pairPopoverAnchor, setPairPopoverAnchor] = useState<{
    id: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);
  const [tableThumbAnchor, setTableThumbAnchor] = useState<{
    id: string;
    rect: { top: number; left: number; bottom: number; right: number };
  } | null>(null);
  const tableThumbHoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (missingArtworkIds.size === 0) {
      setShowMissingArtworkOnly(false);
    }
  }, [missingArtworkIds]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeFilter.type !== "recentlyDeleted") return;
    if (isPairMode || recentlyDeletedTotalCount === 0) {
      setActiveFilter({ type: "all" });
    }
  }, [activeFilter.type, isOpen, isPairMode, recentlyDeletedTotalCount]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = window.localStorage.getItem(STOCKPILE_VIEW_STORAGE_KEY);
      if (stored === "grid" || stored === "table") {
        setViewMode(stored);
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, [isOpen]);

  useEffect(() => {
    if (!hasMissingArtworkParam) return;
    if (didAutoApplyMissingArtworkRef.current) return;
    if (missingArtworkIds.size === 0) return;
    setShowMissingArtworkOnly(true);
    didAutoApplyMissingArtworkRef.current = true;
  }, [hasMissingArtworkParam, missingArtworkIds]);

  useEffect(() => {
    return () => {
      if (pairHoverTimeoutRef.current) {
        window.clearTimeout(pairHoverTimeoutRef.current);
      }
      if (tableThumbHoverTimeoutRef.current) {
        window.clearTimeout(tableThumbHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isPairMode) return;
    setTemplateFilter("all");
    setSelectedIds([]);
    setShowUnpairedOnly(false);
    setIsManagingCollections(false);
  }, [isOpen, isPairMode]);

  useEffect(() => {
    if (isOpen) return;
    setExportPairPrompt(null);
  }, [isOpen]);

  useEscapeModalAware({
    id: "stockpile-export-prompt",
    isOpen: Boolean(exportPairPrompt),
    onEscape: () => setExportPairPrompt(null),
  });

  useEscapeModalAware({
    id: "stockpile-collections-drawer",
    isOpen: isCollectionsDrawerOpen,
    onEscape: () => setIsCollectionsDrawerOpen(false),
  });

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const className = styles.stockpileBodyDragging;
    if (dragActiveId) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => document.body.classList.remove(className);
  }, [dragActiveId]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    apiClient
      .listPairs()
      .then((pairs) => {
        if (!active) return;
        const nextPairsByBack = new Map<string, string[]>();
        const nextBackByFront = new Map<string, string>();
        pairs.forEach((pair) => {
          if (!pair.frontFaceId || !pair.backFaceId) return;
          nextBackByFront.set(pair.frontFaceId, pair.backFaceId);
          const existing = nextPairsByBack.get(pair.backFaceId) ?? [];
          existing.push(pair.frontFaceId);
          nextPairsByBack.set(pair.backFaceId, existing);
        });
        setPairsByBackId(nextPairsByBack);
        setBackByFrontId(nextBackByFront);
      })
      .catch(() => {
        if (!active) return;
        setPairsByBackId(new Map());
        setBackByFrontId(new Map());
      });
    return () => {
      active = false;
    };
  }, [cards, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      return;
    }
    const normalizedInitial =
      initialSelectedIds?.filter((id) => typeof id === "string" && id.length > 0) ?? [];
    const filteredInitial = activeCardId
      ? normalizedInitial.filter((id) => id !== activeCardId)
      : normalizedInitial;
    if (isPairMode) {
      setPairingBaselineIds(filteredInitial);
      setSelectedIds((prev) => {
        const base = prev.length ? prev : [];
        const merged = Array.from(new Set([...base, ...filteredInitial]));
        return merged;
      });
      return;
    }
    setPairingBaselineIds([]);
    setSelectedIds(() => {
      if (!normalizedInitial.length) {
        return [];
      }
      const merged = new Set<string>(normalizedInitial);
      return Array.from(merged);
    });
  }, [isOpen, activeCardId, isPairMode, isPairBacks, initialSelectedIds]);

  const selectedCard =
    selectedIds.length === 1 ? cards.find((card) => card.id === selectedIds[0]) : undefined;
  const visibleSelectedIds = useMemo(() => {
    if (!filteredCards.length || !selectedIds.length) return [];
    const visibleIds = new Set(filteredCards.map((card) => card.id));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [filteredCards, selectedIds]);
  const hasMultiSelection = selectedIds.length > 1;
  const hasSavedCards = cards.some((card) => card.deletedAt == null);
  const hasRecentlyDeletedCards = cards.some((card) => typeof card.deletedAt === "number");
  const isLibraryEmpty = !hasSavedCards && !hasRecentlyDeletedCards;
  const hasActiveNarrowing =
    search.trim().length > 0 ||
    templateFilter !== "all" ||
    showUnpairedOnly ||
    showMissingArtworkOnly ||
    activeFilter.type !== "all";
  const templateFilterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    cardTemplates.forEach((template) => {
      map[template.id] = getTemplateNameLabel(language, template);
    });
    return map;
  }, [language]);
  const filterLabel =
    templateFilter === "all"
      ? t("ui.allTypes")
      : templateFilter === "front"
        ? t("cardFace.frontFacing")
        : templateFilter === "back"
          ? t("cardFace.backFacing")
          : (templateFilterLabelMap[templateFilter] ?? templateFilter);
  const cardById = useMemo(() => {
    const map = new Map<string, CardRecord>();
    cards.forEach((card) => {
      map.set(card.id, card);
    });
    return map;
  }, [cards]);
  const existingCardIdSet = useMemo(() => new Set(cards.map((card) => card.id)), [cards]);
  const activeBackId = useMemo(() => {
    if (!isPairFronts || !activeCardId) return null;
    return activeCardId;
  }, [isPairFronts, activeCardId]);
  const pairedByTargetId = useMemo(() => {
    const map = new Map<string, CardRecord[]>();
    pairsByBackId.forEach((frontIds, backId) => {
      const fronts = frontIds
        .map((frontId) => cardById.get(frontId))
        .filter((card): card is CardRecord => Boolean(card));
      if (fronts.length) {
        map.set(backId, fronts);
      }
    });
    return map;
  }, [pairsByBackId, cardById]);
  const selectedVisibleCards = cards.filter((card) => visibleSelectedIds.includes(card.id));
  const activeCollection =
    activeFilter.type === "collection"
      ? collections.find((collection) => collection.id === activeFilter.id)
      : null;
  const deleteCollectionName = deleteCollectionPrompt?.collectionId
    ? (collections.find((collection) => collection.id === deleteCollectionPrompt.collectionId)
        ?.name ?? "")
    : "";
  const collectionsToggleLabel = useMemo(() => {
    if (activeFilter.type === "recent") return t("actions.recentCards");
    if (activeFilter.type === "recentlyDeleted") return t("actions.recentlyDeleted");
    if (activeFilter.type === "unfiled") return t("actions.unfiled");
    if (activeFilter.type === "collection") return activeCollection?.name ?? t("label.collections");
    return t("actions.allCards");
  }, [activeCollection?.name, activeFilter.type, t]);
  const visibleCollections = useMemo(() => {
    if (!isPairMode) return collections;
    return collections.filter((collection) => visibleCollectionIds.has(collection.id));
  }, [collections, isPairMode, visibleCollectionIds]);
  const selectedCountByCollection = useMemo(() => {
    if (!collections.length || !selectedIds.length) return new Map<string, number>();
    const selectedSet = new Set(selectedIds);
    const map = new Map<string, number>();
    collections.forEach((collection) => {
      let count = 0;
      collection.cardIds.forEach((cardId) => {
        if (selectedSet.has(cardId)) {
          count += 1;
        }
      });
      if (count > 0) {
        map.set(collection.id, count);
      }
    });
    return map;
  }, [collections, selectedIds]);
  const collectionsWithMissingArtwork = useMemo(() => {
    if (!missingArtworkIds.size) return new Set<string>();
    const set = new Set<string>();
    collections.forEach((collection) => {
      if (collection.cardIds.some((id) => missingArtworkIds.has(id))) {
        set.add(collection.id);
      }
    });
    return set;
  }, [collections, missingArtworkIds]);
  const isTableView = !isPairMode && viewMode === "table";
  const activeCollectionCards = activeCollection
    ? cards.filter(
        (card) => activeCollection.cardIds.includes(card.id) && eligibleIdSet.has(card.id),
      )
    : [];
  const exportCards =
    activeFilter.type === "collection" && selectedVisibleCards.length === 0
      ? activeCollectionCards
      : selectedVisibleCards;
  const tableHeaders = useMemo(
    () => ({
      card: t("label.card"),
      name: t("label.cardName"),
      type: t("label.cardType"),
      face: t("label.cardFace"),
      modified: t("label.lastModified"),
      pairing: t("label.pairing"),
    }),
    [t],
  );
  const cardViews = useMemo<StockpileCardView[]>(() => {
    const resolveCardThumb = (card: CardRecord): StockpileCardThumb => ({
      id: card.id,
      thumbnailBlob: card.thumbnailBlob ?? null,
      templateThumbSrc: (() => {
        const src = cardTemplatesById[card.templateId]?.thumbnail?.src ?? null;
        return src ? normalizeFileProtocolAssetUrl(src) : null;
      })(),
      name: card.name ?? card.title ?? "",
    });

    return filteredCards.map((card) => {
      const templateMeta = cardTemplatesById[card.templateId];
      const effectiveFace = resolveEffectiveFace(card.face, templateMeta?.defaultFace ?? "front");
      const pairedBackId = backByFrontId.get(card.id) ?? null;
      const pairedBack = pairedBackId ? (cardById.get(pairedBackId) ?? null) : null;
      const pairedFronts = pairedByTargetId.get(card.id) ?? [];
      const pairedFrontThumbs = pairedFronts.map((paired) => resolveCardThumb(paired));
      const updated = new Date(card.updatedAt);

      return {
        id: card.id,
        name: card.name,
        templateId: card.templateId,
        templateLabel: templateFilterLabelMap[card.templateId] ?? card.templateId,
        effectiveFace,
        faceLabel: effectiveFace === "back" ? t("cardFace.back") : t("cardFace.front"),
        facePillLabel: effectiveFace === "back" ? t("cardFace.back") : t("cardFace.front"),
        updatedLabel: updated.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
        timeLabel: updated.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        thumbnailBlob: card.thumbnailBlob ?? null,
        templateThumbSrc: (() => {
          const src = templateMeta?.thumbnail?.src ?? null;
          return src ? normalizeFileProtocolAssetUrl(src) : null;
        })(),
        paired: {
          back: pairedBack ? resolveCardThumb(pairedBack) : null,
          fronts: pairedFrontThumbs,
          frontsVisible: pairedFrontThumbs.slice(0, 3),
          frontsOverflow: Math.max(0, pairedFrontThumbs.length - 3),
        },
        isSelected: selectedIds.includes(card.id),
      };
    });
  }, [
    filteredCards,
    selectedIds,
    templateFilterLabelMap,
    cardById,
    pairedByTargetId,
    backByFrontId,
  ]);
  const resolveOverlayThumb = (id: string, blob: Blob | null) => {
    if (typeof window === "undefined") {
      return { url: null as string | null, onLoad: undefined as (() => void) | undefined };
    }
    if (ENABLE_CARD_THUMB_CACHE) {
      return { url: getCachedCardThumbnailUrl(id, blob), onLoad: undefined };
    }
    const url = getLegacyCardThumbnailUrl(id, blob ?? null);
    return {
      url,
      onLoad: url ? () => releaseLegacyCardThumbnailUrl(url) : undefined,
    };
  };
  const dragOverlayThumbs = useMemo(() => {
    if (!dragActiveId || draggingIds.length === 0) return [];
    const orderedIds = [dragActiveId, ...draggingIds.filter((id) => id !== dragActiveId)].slice(
      0,
      5,
    );
    return orderedIds.map((id) => {
      const card = cardById.get(id);
      if (!card) {
        return { id, url: null as string | null, onLoad: undefined as (() => void) | undefined };
      }
      const templateThumbSrcRaw = cardTemplatesById[card.templateId]?.thumbnail?.src ?? null;
      const templateThumbSrc = templateThumbSrcRaw
        ? normalizeFileProtocolAssetUrl(templateThumbSrcRaw)
        : null;
      const { url, onLoad } = resolveOverlayThumb(id, card.thumbnailBlob ?? null);
      return { id, url: url ?? templateThumbSrc, onLoad };
    });
  }, [cardById, dragActiveId, draggingIds]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (!dragEnabled) return;
    const draggedId = String(active.id);
    const currentSelected = selectedIdsRef.current;
    if (currentSelected.includes(draggedId)) {
      setDraggingIds(currentSelected);
    } else {
      setSelectedIds([draggedId]);
      setDraggingIds([draggedId]);
    }
    setDragActiveId(draggedId);
  };

  const handleDragEnd = async ({ over }: DragEndEvent) => {
    setDragActiveId(null);
    setDraggingIds([]);
    if (!dragEnabled) return;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("collection:")) return;
    const collectionId = overId.replace("collection:", "");
    const target = collections.find((collection) => collection.id === collectionId);
    if (!target) return;
    const nextCardIds = mergeCollectionCardIds(target.cardIds, draggingIds);
    if (nextCardIds.length === target.cardIds.length) return;
    try {
      await apiClient.updateCollection({ cardIds: nextCardIds }, { params: { id: collectionId } });
      const refreshed = await apiClient.listCollections();
      setCollections(refreshed);
      await invalidateCollectionsQueries(queryClient);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[StockpileModal] Failed to add cards to collection", error);
    }
  };

  const handleDragCancel = () => {
    setDragActiveId(null);
    setDraggingIds([]);
  };
  const cardActions: StockpileCardActions = useMemo(
    () => ({
      onCardClick: (id, event, isPairMode) => {
        if (isPairMode) {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id],
          );
          return;
        }
        const allowMulti = event.metaKey || event.ctrlKey;
        if (allowMulti) {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id],
          );
          return;
        }
        setSelectedIds((prev) => resolveSingleSelectToggle(prev, id));
      },
      onCardSetSelected: (id, selected, isPairMode) => {
        if (isPairMode) {
          setSelectedIds((prev) => {
            const isSelected = prev.includes(id);
            return selected
              ? isSelected
                ? prev
                : [...prev, id]
              : prev.filter((cardId) => cardId !== id);
          });
          return;
        }
        setSelectedIds((prev) => {
          const isSelected = prev.includes(id);
          if (selected) {
            return isSelected ? prev : [...prev, id];
          }
          return isSelected ? prev.filter((cardId) => cardId !== id) : prev;
        });
      },
      onCardSelectSingle: (id) => {
        setSelectedIds((prev) => resolveSingleSelectToggle(prev, id));
      },
      onCardDoubleClick: (id) => {
        if (!onLoadCard) return;
        const card = cardById.get(id);
        if (!card) return;
        onLoadCard(card);
        onClose();
      },
      onPairHoverEnter: (id, rect) => {
        if (pairHoverTimeoutRef.current) {
          window.clearTimeout(pairHoverTimeoutRef.current);
        }
        setPairPopoverAnchor({
          id,
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
        });
        setHoveredPairCardId(id);
      },
      onPairHoverLeave: (id) => {
        if (pairHoverTimeoutRef.current) {
          window.clearTimeout(pairHoverTimeoutRef.current);
        }
        pairHoverTimeoutRef.current = window.setTimeout(() => {
          setHoveredPairCardId((prev) => (prev === id ? null : prev));
          setPairPopoverAnchor((prev) => (prev?.id === id ? null : prev));
        }, 200);
      },
      onTableThumbEnter: (id, rect) => {
        if (tableThumbHoverTimeoutRef.current) {
          window.clearTimeout(tableThumbHoverTimeoutRef.current);
        }
        setTableThumbAnchor({
          id,
          rect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
        });
      },
      onTableThumbLeave: (id) => {
        if (tableThumbHoverTimeoutRef.current) {
          window.clearTimeout(tableThumbHoverTimeoutRef.current);
        }
        tableThumbHoverTimeoutRef.current = window.setTimeout(() => {
          setTableThumbAnchor((prev) => (prev?.id === id ? null : prev));
        }, 200);
      },
    }),
    [cardById, onClose, onLoadCard],
  );

  const sortCardsByName = (items: CardRecord[]) =>
    items.sort((a, b) => {
      const aName = a.nameLower ?? a.name.toLocaleLowerCase();
      const bName = b.nameLower ?? b.name.toLocaleLowerCase();
      return aName.localeCompare(bName);
    });

  const finalizeHardDelete = async (ids: string[], confirmCascade = false) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    await apiClient.deleteCards({
      ids,
      mode: "confirmable-cascade",
      confirmCascade,
    });

    (Object.keys(activeCardIdByTemplate) as TemplateId[]).forEach((templateId) => {
      const activeId = activeCardIdByTemplate[templateId];
      if (!activeId || !idSet.has(activeId)) return;
      setActiveCard(templateId, null, null);
      if (selectedTemplateId === templateId) {
        resetWithSaved(createEditorDefaultValues(templateId));
        }
    });

    const refreshedCards = await apiClient.listCards({
      queries: { status: "saved", deleted: "include" },
    });
    setCards(refreshedCards);
    const refreshedCollections = await apiClient.listCollections();
    setCollections(refreshedCollections);
    await invalidateCollectionsQueries(queryClient);
    setSelectedIds([]);
  };

  const resolvePairedExportPlan = (base: CardRecord[]) => {
    const baseIdSet = new Set(base.map((card) => card.id));
    const baseIds = Array.from(baseIdSet);
    const pairedCandidateSet = new Set<string>();
    const previewRows: { left: CardRecord[]; right: CardRecord[] }[] = [];
    const groupMap = new Map<string, CardRecord[]>();

    base.forEach((card) => {
      const isBack = card.face === "back";
      const pairedBackId = !isBack ? backByFrontId.get(card.id) : null;
      const groupKey = !isBack && pairedBackId ? pairedBackId : card.id;
      const existing = groupMap.get(groupKey) ?? [];
      existing.push(card);
      groupMap.set(groupKey, existing);
    });

    groupMap.forEach((leftCards, groupKey) => {
      sortCardsByName(leftCards);
      const rightCards: CardRecord[] = [];
      const hasBackInLeft = leftCards.some((card) => card.face === "back" || card.id === groupKey);

      if (hasBackInLeft) {
        const pairedFronts = pairedByTargetId.get(groupKey) ?? [];
        pairedFronts.forEach((front) => {
          pairedCandidateSet.add(front.id);
          if (!baseIdSet.has(front.id)) {
            rightCards.push(front);
          }
        });
      } else {
        const pairedBack = cardById.get(groupKey);
        if (pairedBack) {
          pairedCandidateSet.add(pairedBack.id);
          if (!baseIdSet.has(pairedBack.id)) {
            rightCards.push(pairedBack);
          }
        }
      }

      if (rightCards.length > 0) {
        sortCardsByName(rightCards);
        previewRows.push({ left: leftCards, right: rightCards });
      }
    });

    const pairedCards = Array.from(pairedCandidateSet)
      .filter((id) => !baseIdSet.has(id))
      .map((id) => cardById.get(id))
      .filter((card): card is CardRecord => Boolean(card));
    sortCardsByName(pairedCards);

    return {
      baseIds,
      pairedIds: pairedCards.map((card) => card.id),
      previewRows,
    };
  };

  const canExport =
    !exportFlow.isExporting &&
    exportCards.length > 0 &&
    (activeFilter.type === "collection" ||
      ((activeFilter.type === "all" || activeFilter.type === "unfiled") &&
        selectedVisibleCards.length > 0));
  const canExportCollectionPdf =
    ENABLE_STOCKPILE_COLLECTION_PDF_EXPORT &&
    activeFilter.type === "collection" &&
    exportCards.length > 0;
  const exportCount = exportCards.length;
  const exportLabel = exportFlow.isExporting
    ? t("actions.exporting")
    : activeFilter.type === "collection" && selectedVisibleCards.length === 0
      ? `${t("actions.exportAll")} ${t("actions.fromThisCollection")}`
      : activeFilter.type === "collection"
        ? `${t("actions.export")} (${exportCount}) ${t("actions.fromThisCollection")}`
        : `${t("actions.export")} (${exportCount})`;
  const pdfExportLabel =
    activeFilter.type === "collection" && selectedVisibleCards.length === 0
      ? `${t("actions.export")} PDF ${t("actions.fromThisCollection")}`
      : `${t("actions.export")} PDF (${exportCount}) ${t("actions.fromThisCollection")}`;
  const handleExportCards = async (
    cardsToExport: CardRecord[],
    options?: { skipIds?: Set<string>; skipNotes?: Map<string, string>; skipPrecheck?: boolean },
  ) => {
    const hydratedCards = await hydrateCardsForExport(cardsToExport);
    const result = await exportFlow.startBulkCardExport({
      cards: hydratedCards,
      skipIds: options?.skipIds,
      skipNotes: options?.skipNotes,
      skipPrecheck: options?.skipPrecheck,
      resolveName: (card, usedNames) =>
        resolveExportFileName(
          card.name || card.title || templateFilterLabelMap[card.templateId] || card.templateId,
          usedNames,
        ),
      resolveZipName: () =>
        resolveZipFileName(() => {
          if (activeFilter.type !== "collection") return null;
          return collections.find((collection) => collection.id === activeFilter.id)?.name ?? null;
        }),
    });
    if (result.status === "missing-assets") {
      setMissingAssetsPrompt(result.prompt);
    }
  };

  const handleBulkExport = async () => {
    if (!canExport) return;

    const exportScope =
      activeFilter.type === "collection"
        ? selectedVisibleCards.length === 0
          ? "collection_all"
          : "collection_selected"
        : selectedVisibleCards.length === 0
          ? "stockpile_all"
          : "stockpile_selected";
    track("export_started", { scope: exportScope });

    const { baseIds, pairedIds, previewRows } = resolvePairedExportPlan(exportCards);
    if (pairedIds.length > 0) {
      const baseCount = baseIds.length;
      const exportOnlyLabel =
        activeFilter.type === "collection" && selectedVisibleCards.length === 0
          ? formatMessageWith(t, "label.exportOnlyInCollection", { count: baseCount })
          : formatMessageWith(t, "label.exportOnlySelected", { count: baseCount });
      setExportPairPrompt({
        baseIds,
        pairedIds,
        exportLabel,
        exportOnlyLabel,
        previewRows,
      });
      return;
    }

    await handleExportCards(exportCards);
  };

  if (!isOpen) {
    return null;
  }

  const filtersPanelToggleLabel = isFiltersPanelOpen
    ? "Collapse collections panel"
    : "Expand collections panel";

  const panel = (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className={`${styles.stockpilePanel} ${
            dragActiveId ? styles.stockpilePanelDragging : ""
          }`}
        >
          <div className={styles.stockpilePanelBody}>
            <div className={styles.stockpileLayout}>
              <section className={styles.stockpileCenterPanel}>
                <div className={styles.stockpileCenterStack}>
                  <StockpileToolbar
                    onOpenCollections={() => setIsCollectionsDrawerOpen(true)}
                    collectionsToggleLabel={collectionsToggleLabel}
                    search={search}
                    onSearchChange={setSearch}
                    templateFilter={templateFilter}
                    onTemplateFilterChange={setTemplateFilter}
                    filterLabel={filterLabel}
                    totalCount={totalCount}
                    faceCounts={faceCounts}
                    typeCounts={typeCounts}
                    isPairMode={isPairMode}
                    isPairBacks={isPairBacks}
                    isPairFronts={isPairFronts}
                    showUnpairedOnly={showUnpairedOnly}
                    onShowUnpairedOnlyChange={setShowUnpairedOnly}
                    showMissingArtworkOnly={showMissingArtworkOnly}
                    onShowMissingArtworkOnlyChange={setShowMissingArtworkOnly}
                    selectedCount={selectedIds.length}
                  />
                  {!isPairMode ? (
                    <StockpileActionsBar
                      viewMode={viewMode}
                      onViewModeChange={(next) => {
                        setViewMode(next);
                        try {
                          window.localStorage.setItem(STOCKPILE_VIEW_STORAGE_KEY, next);
                        } catch {
                          // Ignore localStorage errors.
                        }
                      }}
                      isPairBacks={isPairBacks}
                      filteredCards={filteredCards}
                      selectedIds={selectedIds}
                      activeFilter={activeFilter}
                      addToCollectionControl={
                        activeFilter.type === "recentlyDeleted" ? null : (
                          <StockpileAddToCollectionController
                            collections={collections}
                            activeFilter={activeFilter}
                            visibleSelectedIds={visibleSelectedIds}
                            onCollectionsUpdated={setCollections}
                          />
                        )
                      }
                      onRemoveFromCollection={async () => {
                        if (activeFilter.type !== "collection") return;
                        const target = collections.find((item) => item.id === activeFilter.id);
                        if (!target) return;
                        try {
                          const remaining = target.cardIds.filter(
                            (id) => !selectedIds.includes(id),
                          );
                          await apiClient.updateCollection(
                            { cardIds: remaining },
                            { params: { id: target.id } },
                          );
                          const refreshed = await apiClient.listCollections();
                          setCollections(refreshed);
                          await invalidateCollectionsQueries(queryClient);
                          setSelectedIds([]);
                        } catch (error) {
                          // eslint-disable-next-line no-console
                          console.error("[StockpileModal] Failed to remove from collection", error);
                        }
                      }}
                      onRestoreCards={
                        activeFilter.type === "recentlyDeleted"
                          ? async () => {
                              if (!selectedIds.length) return;
                              const ids = [...selectedIds];
                              try {
                                await apiClient.restoreCards({ ids });
                                const refreshed = await apiClient.listCards({
                                  queries: { status: "saved", deleted: "include" },
                                });
                                setCards(refreshed);
                                setSelectedIds([]);
                              } catch (error) {
                                // eslint-disable-next-line no-console
                                console.error("[StockpileModal] Failed to restore cards", error);
                              }
                            }
                          : undefined
                      }
                      onDeleteCards={() => {
                        if (!selectedIds.length) return;
                        const ids = [...selectedIds];
                        const idSet = new Set(ids);

                        const clearActiveCardsForDeletedIds = () => {
                          (Object.keys(activeCardIdByTemplate) as TemplateId[]).forEach(
                            (templateId) => {
                              const activeId = activeCardIdByTemplate[templateId];
                              if (!activeId || !idSet.has(activeId)) return;
                              setActiveCard(templateId, null, null);
                              if (selectedTemplateId === templateId) {
                                resetWithSaved(createEditorDefaultValues(templateId));
                              }
                            },
                          );
                        };

                        const refreshSavedCards = async () => {
                          const refreshed = await apiClient.listCards({
                            queries: { status: "saved", deleted: "include" },
                          });
                          setCards(refreshed);
                        };

                        const runHardDelete = async (confirmCascade: boolean) => {
                          try {
                            await finalizeHardDelete(ids, confirmCascade);
                          } catch (error) {
                            if (
                              isCardDeleteConfirmRequiredError(error) ||
                              isPairDeleteConfirmRequiredError(error)
                            ) {
                              if (isCardDeleteConfirmRequiredError(error)) {
                                setCardDeletePendingIds(ids);
                                setCardDeleteUsagePrompt(error.report);
                              } else {
                                setPairUsagePendingDeleteIds(ids);
                                setPairUsagePrompt(error.report);
                              }
                              return;
                            }
                            throw error;
                          }
                        };

                        const runSoftDelete = async () => {
                          await apiClient.softDeleteCards({ ids });
                          clearActiveCardsForDeletedIds();
                          await refreshSavedCards();
                          setSelectedIds([]);
                        };

                        const softTitle = t("confirm.softDeleteCardsTitle");
                        const softBody = t("confirm.softDeleteCardsBody");
                        const hardTitle = t("confirm.hardDeleteCardsTitle");
                        const hardBody = t("confirm.hardDeleteCardsBody");

                        setConfirmDialog({
                          confirmLabel:
                            ids.length > 1
                              ? `${
                                  activeFilter.type === "recentlyDeleted"
                                    ? t("actions.deletePermanently")
                                    : t("actions.moveToRecentlyDeleted")
                                } (${ids.length})`
                              : activeFilter.type === "recentlyDeleted"
                                ? t("actions.deletePermanently")
                                : t("actions.moveToRecentlyDeleted"),
                          title: activeFilter.type === "recentlyDeleted" ? hardTitle : softTitle,
                          body: activeFilter.type === "recentlyDeleted" ? hardBody : softBody,
                          ...(activeFilter.type !== "recentlyDeleted"
                            ? {
                                extraLabel:
                                  ids.length > 1
                                    ? `${t("actions.deletePermanently")} (${ids.length})`
                                    : t("actions.deletePermanently"),
                                onExtra: async () => {
                                  try {
                                    await runHardDelete(false);
                                  } catch (error) {
                                    // eslint-disable-next-line no-console
                                    console.error(
                                      "[StockpileModal] Failed to permanently delete cards",
                                      error,
                                    );
                                  } finally {
                                    setConfirmDialog(null);
                                  }
                                },
                              }
                            : {}),
                          onConfirm: async () => {
                            try {
                              if (activeFilter.type === "recentlyDeleted") {
                                await runHardDelete(false);
                              } else {
                                await runSoftDelete();
                              }
                            } catch (error) {
                              // eslint-disable-next-line no-console
                              console.error("[StockpileModal] Failed to delete cards", error);
                            } finally {
                              setConfirmDialog(null);
                            }
                          },
                        });
                      }}
                      onSelectAllToggle={(visibleIds) => {
                        if (!visibleIds.length) return;
                        setSelectedIds((prev) => {
                          const prevSet = new Set(prev);
                          const allSelected = visibleIds.every((id) => prevSet.has(id));
                          if (allSelected) {
                            return prev.filter((id) => !visibleIds.includes(id));
                          }
                          const merged = new Set(prev);
                          visibleIds.forEach((id) => merged.add(id));
                          return Array.from(merged);
                        });
                      }}
                    />
                  ) : null}
                  <div
                    className={`${styles.stockpileCenterResults} ${
                      dragActiveId ? styles.stockpileCenterResultsNoScroll : ""
                    }`}
                  >
                    <StockpileContentPane
                      filteredCards={filteredCards}
                      search={search}
                      activeFilter={activeFilter}
                      templateFilter={templateFilter}
                      totalCount={totalCount}
                      filterLabel={filterLabel}
                      frame={frame}
                      isLoadingCards={isLoadingCards}
                      isLibraryEmpty={isLibraryEmpty}
                      hasActiveNarrowing={hasActiveNarrowing}
                      isTableView={isTableView}
                      cardViews={cardViews}
                      cardActions={cardActions}
                      isPairMode={isPairMode}
                      dragEnabled={dragEnabled}
                      onClearSelection={() => setSelectedIds([])}
                      tableHeaders={tableHeaders}
                    />
                  </div>
                </div>
                <StockpileFooter
                  isPairMode={isPairMode}
                  isPairFronts={isPairFronts}
                  selectedIds={selectedIds}
                  activeBackId={activeBackId}
                  cardById={cardById}
                  backByFrontId={backByFrontId}
                  onConfirmSelection={onConfirmSelection}
                  onClose={onClose}
                  baselineSelectedIds={pairingBaselineIds}
                  onBulkExport={handleBulkExport}
                  canExport={canExport}
                  exportLabel={exportLabel}
                  onPdfExport={
                    ENABLE_STOCKPILE_COLLECTION_PDF_EXPORT && activeFilter.type === "collection"
                      ? () =>
                          setPendingCollectionPdfExport({
                            collectionName: activeCollection?.name ?? null,
                            faceIds: exportCards.map((card) => card.id),
                          })
                      : undefined
                  }
                  canPdfExport={canExportCollectionPdf}
                  pdfExportLabel={
                    ENABLE_STOCKPILE_COLLECTION_PDF_EXPORT && activeFilter.type === "collection"
                      ? pdfExportLabel
                      : undefined
                  }
                  selectedCard={selectedCard}
                  hasMultiSelection={hasMultiSelection}
                  onLoadSelectedCard={() => {
                    if (!selectedCard || !onLoadCard) return;
                    onLoadCard(selectedCard);
                    onClose();
                  }}
                />
              </section>
              {isCollectionsDrawerOpen ? (
                <div
                  className={styles.stockpileCollectionsBackdrop}
                  role="presentation"
                  onClick={() => setIsCollectionsDrawerOpen(false)}
                />
              ) : null}
              <div
                className={`${styles.stockpileRightPanel} ${
                  !isFiltersPanelOpen ? styles.stockpileRightPanelCollapsed : ""
                } ${isCollectionsDrawerOpen ? styles.stockpileRightPanelDrawerOpen : ""}`}
              >
                <button
                  type="button"
                  className={styles.stockpileRightPanelToggle}
                  onClick={() => setIsFiltersPanelOpen(!isFiltersPanelOpen)}
                  title={filtersPanelToggleLabel}
                  aria-label={filtersPanelToggleLabel}
                >
                  {isFiltersPanelOpen ? (
                    <ChevronRight
                      className={styles.stockpileRightPanelToggleIcon}
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronLeft
                      className={styles.stockpileRightPanelToggleIcon}
                      aria-hidden="true"
                    />
                  )}
                </button>
                <div
                  className={`${styles.stockpileRightPanelContent} ${
                    !isFiltersPanelOpen ? styles.stockpileRightPanelContentCollapsed : ""
                  }`}
                  aria-hidden={!isFiltersPanelOpen}
                >
                  <StockpileSidebar
                    footerActions={
                      !isPairMode ? (
                        <div className={styles.stockpileCollectionsFooterActions}>
                          <button
                            type="button"
                            className={styles.stockpileCollectionsFooterButton}
                            title={t("actions.newCollection")}
                            aria-label={t("actions.newCollection")}
                            onClick={() =>
                              setCollectionModalState({ mode: "create", collectionId: null })
                            }
                          >
                            <FolderPlus size={18} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={`${styles.stockpileCollectionsFooterButton} ${
                              isManagingCollections
                                ? styles.stockpileCollectionsFooterButtonActive
                                : ""
                            }`}
                            title={
                              isManagingCollections
                                ? t("actions.cancel")
                                : t("actions.manageCollections")
                            }
                            aria-label={
                              isManagingCollections
                                ? t("actions.cancel")
                                : t("actions.manageCollections")
                            }
                            aria-pressed={isManagingCollections}
                            onClick={() => setIsManagingCollections((prev) => !prev)}
                          >
                            {isManagingCollections ? (
                              <X size={18} aria-hidden="true" />
                            ) : (
                              <Pencil size={18} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      ) : null
                    }
                    onRequestClose={() => setIsCollectionsDrawerOpen(false)}
                    onEditCollection={(collectionId) => {
                      setCollectionModalState({ mode: "edit", collectionId });
                    }}
                    onDeleteCollection={(collectionId) => {
                      setDeleteCollectionPrompt({ collectionId });
                    }}
                    isManagingCollections={isManagingCollections}
                    activeFilter={activeFilter}
                    onFilterChange={(next) => {
                      setActiveFilter(next);
                      setIsCollectionsDrawerOpen(false);
                    }}
                    isPairMode={isPairMode}
                    showMissingArtworkOnly={showMissingArtworkOnly}
                    collectionsWithMissingArtwork={collectionsWithMissingArtwork}
                    selectedIds={selectedIds}
                    onClearSelection={() => setSelectedIds([])}
                    recentCardsCount={recentCards.length}
                    recentlyDeletedCount={recentlyDeletedCount}
                    recentlyDeletedTotalCount={recentlyDeletedTotalCount}
                    overallCount={overallCount}
                    unfiledCount={unfiledCount}
                    visibleCollections={visibleCollections}
                    collectionCounts={collectionCounts}
                    selectedCountByCollection={selectedCountByCollection}
                    dragEnabled={dragEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null}>
          {dragActiveId ? (
            <div className={styles.stockpileDragGhost} aria-hidden="true">
              <div className={styles.stockpileDragGhostStack}>
                {dragOverlayThumbs.map((thumb, index) => (
                  <div
                    key={thumb.id}
                    className={`${styles.stockpileDragGhostCard} ${
                      styles[`stockpileDragGhostCard_${index}`]
                    } ${styles.stockpileDragGhostCardGrab}`}
                  >
                    <div className={styles.stockpileDragGhostCardInner}>
                      {thumb.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb.url} alt="" onLoad={thumb.onLoad} />
                      ) : (
                        <div className={styles.stockpileDragGhostPlaceholder} />
                      )}
                      {index === 0 && draggingIds.length > 5 ? (
                        <div className={styles.stockpileDragGhostCount}>{draggingIds.length}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {collectionModalState ? (
        <StockpileCollectionModal
          isOpen={Boolean(collectionModalState)}
          mode={collectionModalState.mode}
          collectionId={collectionModalState.collectionId}
          collections={collections}
          onCreate={async (name, description) => {
            try {
              const created = await apiClient.createCollection({ name, description });
              setActiveFilter({ type: "collection", id: created.id });
              const refreshed = await apiClient.listCollections();
              setCollections(refreshed);
              await invalidateCollectionsQueries(queryClient);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("[StockpileModal] Failed to create collection", error);
            }
          }}
          onUpdate={async (id, name, description) => {
            try {
              await apiClient.updateCollection({ name, description }, { params: { id } });
              const refreshed = await apiClient.listCollections();
              setCollections(refreshed);
              await invalidateCollectionsQueries(queryClient);
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("[StockpileModal] Failed to update collection", error);
            }
          }}
          onClose={() => setCollectionModalState(null)}
        />
      ) : null}
      <CollectionPdfExportSummaryModal
        isOpen={Boolean(pendingCollectionPdfExport)}
        collectionName={pendingCollectionPdfExport?.collectionName ?? null}
        faceIds={pendingCollectionPdfExport?.faceIds ?? []}
        onClose={() => setPendingCollectionPdfExport(null)}
      />
      {deleteCollectionPrompt ? (
        <ConfirmModal
          isOpen={Boolean(deleteCollectionPrompt)}
          title={t("confirm.deleteCollectionTitle")}
          confirmLabel={t("actions.delete")}
          cancelLabel={t("actions.cancel")}
          onConfirm={async () => {
            const current = deleteCollectionPrompt;
            setDeleteCollectionPrompt(null);
            if (!current) return;
            try {
              await apiClient.deleteCollection(undefined, {
                params: { id: current.collectionId },
              });
              const refreshed = await apiClient.listCollections();
              setCollections(refreshed);
              await invalidateCollectionsQueries(queryClient);
              if (activeFilter.type === "collection" && activeFilter.id === current.collectionId) {
                setActiveFilter({ type: "all" });
              }
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("hqcc.selectedCollectionId");
              }
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error("[StockpileModal] Failed to delete collection", error);
            }
          }}
          onCancel={() => setDeleteCollectionPrompt(null)}
        >
          {(() => {
            const collectionId = deleteCollectionPrompt.collectionId;
            const impact = getDeleteCollectionImpact({
              collectionId,
              collections: collections.map((collection) => ({
                id: collection.id,
                name: collection.name,
                cardIds: collection.cardIds,
              })),
              existingCardIdSet,
            });
            if (!impact) {
              return `${t("confirm.deleteCollectionBodyPrefix")} "${deleteCollectionName}"? ${t(
                "confirm.deleteCollectionBodySuffix",
              )}`;
            }
            return (
              <div className="d-flex flex-column gap-2">
                <div className="fw-semibold">
                  {formatMessageWith(t, "confirm.deleteCollectionHeading", { name: impact.name })}
                </div>
                <div>
                  {formatMessageWith(t, "confirm.deleteCollectionRemovedCount", {
                    count: impact.removedCount,
                  })}
                </div>
                {impact.unfiledCount > 0 ? (
                  <div>
                    {formatMessageWith(t, "confirm.deleteCollectionMoveToUnfiled", {
                      count: impact.unfiledCount,
                    })}
                  </div>
                ) : null}
              </div>
            );
          })()}
        </ConfirmModal>
      ) : null}
      <ConfirmModal
        isOpen={Boolean(cardDeleteUsagePrompt)}
        title={t("decks.pairInUseTitle")}
        confirmLabel={t("actions.confirm")}
        extraLabel={t("decks.openDeck")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          const pending = cardDeleteUsagePrompt;
          setCardDeleteUsagePrompt(null);
          const allIds = cardDeletePendingIds;
          setCardDeletePendingIds([]);
          if (!pending || !allIds.length) return;
          await finalizeHardDelete(allIds, true);
        }}
        onExtra={() => {
          const usage =
            cardDeleteUsagePrompt?.cascadePlan?.deletedDeckUsage?.[0] ??
            cardDeleteUsagePrompt?.cascadePlan?.pairUsage?.[0];
          if (usage) {
            navigate(buildDeckDeepLink({ deckId: usage.deckId, setId: usage.setId }));
          }
          setCardDeleteUsagePrompt(null);
          setCardDeletePendingIds([]);
        }}
        onCancel={() => {
          setCardDeleteUsagePrompt(null);
          setCardDeletePendingIds([]);
        }}
      >
        <div className={styles.pairingUsageList}>
          {(() => {
            const merged = [
              ...(cardDeleteUsagePrompt?.cascadePlan.deletedDeckUsage ?? []),
              ...(cardDeleteUsagePrompt?.cascadePlan.pairUsage ?? []),
            ];
            const deduped = Array.from(
              new Map(
                merged.map((usage) => [`${usage.deckId}:${usage.groupId}:${usage.setId}`, usage]),
              ).values(),
            );
            return (
              <>
                <div>
                  Deleting these cards will remove dependent deck sets and deck entries from the
                  following locations:
                </div>
                <ul className={styles.pairingUsageItems}>
                  {deduped.map((usage) => (
                    <li key={`${usage.deckId}-${usage.setId}`}>
                      {`${usage.deckTitle} › ${usage.groupTitle} › ${usage.setTitle}`}
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </div>
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(pairUsagePrompt)}
        title={t("decks.pairInUseTitle")}
        confirmLabel={t("actions.confirm")}
        extraLabel={t("decks.openDeck")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          if (!pairUsagePrompt) return;
          setPairUsagePrompt(null);
          const allFaceIds = pairUsagePendingDeleteIds;
          if (!allFaceIds.length) return;
          await deletePairsForFaces(allFaceIds, {
            mode: "confirmable-cascade",
            confirmCascade: true,
          });
          await finalizeHardDelete(allFaceIds);
          setPairUsagePendingDeleteIds([]);
        }}
        onExtra={() => {
          const usage = pairUsagePrompt?.cascadePlan?.usage?.[0];
          if (usage) navigate(buildDeckDeepLink({ deckId: usage.deckId, setId: usage.setId }));
          setPairUsagePrompt(null);
          setPairUsagePendingDeleteIds([]);
        }}
        onCancel={() => {
          setPairUsagePrompt(null);
          setPairUsagePendingDeleteIds([]);
        }}
      >
        <div className={styles.pairingUsageList}>
          <div>{t("decks.pairUsage.body")}</div>
          <ul className={styles.pairingUsageItems}>
            {(pairUsagePrompt?.cascadePlan.usage ?? []).map((usage) => (
              <li key={`${usage.deckId}-${usage.setId}`}>
                {`${usage.deckTitle} › ${usage.groupTitle} › ${usage.setTitle}`}
              </li>
            ))}
          </ul>
        </div>
      </ConfirmModal>
      <StockpilePairPopover
        hoveredPairCardId={hoveredPairCardId}
        pairPopoverAnchor={pairPopoverAnchor}
        onMouseEnter={() => {
          if (pairHoverTimeoutRef.current) {
            window.clearTimeout(pairHoverTimeoutRef.current);
          }
          setHoveredPairCardId(hoveredPairCardId);
        }}
        onMouseLeave={() => {
          if (pairHoverTimeoutRef.current) {
            window.clearTimeout(pairHoverTimeoutRef.current);
          }
          pairHoverTimeoutRef.current = window.setTimeout(() => {
            setHoveredPairCardId(null);
            setPairPopoverAnchor(null);
          }, 200);
        }}
        cardById={cardById}
        pairedByTargetId={pairedByTargetId}
        backByFrontId={backByFrontId}
      />
      <StockpileTableThumbPopover
        tableThumbAnchor={tableThumbAnchor}
        onMouseEnter={() => {
          if (tableThumbHoverTimeoutRef.current) {
            window.clearTimeout(tableThumbHoverTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          if (tableThumbHoverTimeoutRef.current) {
            window.clearTimeout(tableThumbHoverTimeoutRef.current);
          }
          tableThumbHoverTimeoutRef.current = window.setTimeout(() => {
            setTableThumbAnchor(null);
          }, 200);
        }}
        cardById={cardById}
      />
      <StockpileMissingAssetsModal
        prompt={missingAssetsPrompt}
        onConfirm={async () => {
          const prompt = missingAssetsPrompt;
          if (!prompt) return;
          setMissingAssetsPrompt(null);
          await handleExportCards(prompt.cards, {
            skipIds: prompt.skipIds,
            skipNotes: prompt.skipNotes,
            skipPrecheck: true,
          });
        }}
        onCancel={() => {
          setMissingAssetsPrompt(null);
        }}
      />
      <StockpileExportPairPrompt
        exportPairPrompt={exportPairPrompt}
        onClose={() => setExportPairPrompt(null)}
        cardById={cardById}
        onExportCards={(cards) => {
          void handleExportCards(cards);
        }}
      />
      {exportFlow.exportUi}
      <StockpileConfirmModal
        confirmDialog={confirmDialog}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
  );

  if (frame === "modal") {
    return (
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={titleOverride ?? t("heading.cards")}
        contentClassName={styles.cardsPopover}
      >
        {panel}
      </ModalShell>
    );
  }

  return panel;
}
