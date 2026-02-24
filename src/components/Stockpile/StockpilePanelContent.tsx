"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import styles from "@/app/page.module.css";
import CardPreview from "@/components/Cards/CardPreview";
import { CardPreviewHandle } from "@/components/Cards/CardPreview/types";
import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import ModalShell from "@/components/common/ModalShell";
import ExportProgressOverlay from "@/components/ExportProgressOverlay";
import { useCardEditor } from "@/components/Providers/CardEditorContext";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";
import { useStockpileData } from "@/components/Stockpile/hooks/useStockpileData";
import { useStockpileFilters } from "@/components/Stockpile/hooks/useStockpileFilters";
import {
  formatMessage,
  resolveExportFileName,
  resolveZipFileName,
} from "@/components/Stockpile/stockpile-utils";
import StockpileActionsBar from "@/components/Stockpile/StockpileActionsBar";
import StockpileAddToCollectionController from "@/components/Stockpile/StockpileAddToCollectionController";
import StockpileCollectionController from "@/components/Stockpile/StockpileCollectionController";
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
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { getTemplateNameLabel } from "@/i18n/getTemplateNameLabel";
import { useI18n } from "@/i18n/I18nProvider";
import { cardRecordToCardData } from "@/lib/card-record-mapper";
import { deleteCards, listCards } from "@/lib/cards-db";
import { listCollections, updateCollection } from "@/lib/collections-db";
import { buildMissingAssetsReport, type MissingAssetReport } from "@/lib/export-assets-cache";
import { runBulkExport } from "@/lib/export-cards";
import { deletePairsForFace, listAllPairs } from "@/lib/pairs-service";
import { createDefaultCardData } from "@/types/card-data";
import type { CardRecord } from "@/types/cards-db";
import type { TemplateId } from "@/types/templates";
import type { OpenCloseProps } from "@/types/ui";

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
  const formatMessageWith = (key: string, vars: Record<string, string | number>) =>
    formatMessage(t(key as never), vars);
  const isPairFronts = mode === "pair-fronts";
  const isPairBacks = mode === "pair-backs";
  const isPairMode = isPairFronts || isPairBacks;
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [showUnpairedOnly, setShowUnpairedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pairsByBackId, setPairsByBackId] = useState<Map<string, string[]>>(new Map());
  const [backByFrontId, setBackByFrontId] = useState<Map<string, string>>(new Map());
  const [activeFilter, setActiveFilter] = useState<
    { type: "all" } | { type: "recent" } | { type: "unfiled" } | { type: "collection"; id: string }
  >({ type: "all" });
  const {
    state: { activeCardIdByTemplate },
    setActiveCard,
    setCardDraft,
    setTemplateDirty,
  } = useCardEditor();
  const { cards, setCards, collections, setCollections } = useStockpileData({
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
  const [exportTarget, setExportTarget] = useState<CardRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCancelled, setExportCancelled] = useState(false);
  const [exportPairPrompt, setExportPairPrompt] = useState<{
    baseIds: string[];
    pairedIds: string[];
    exportLabel: string;
    exportOnlyLabel: string;
    previewRows: { left: CardRecord[]; right: CardRecord[] }[];
  } | null>(null);
  const previewRef = useRef<CardPreviewHandle | null>(null);
  const cancelExportRef = useRef(false);
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
  const [conflictPopoverCardId, setConflictPopoverCardId] = useState<string | null>(null);
  const conflictHoverTimeoutRef = useRef<number | null>(null);
  const tableThumbHoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (missingArtworkIds.size === 0) {
      setShowMissingArtworkOnly(false);
    }
  }, [missingArtworkIds]);

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
      if (conflictHoverTimeoutRef.current) {
        window.clearTimeout(conflictHoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isPairMode) return;
    setTemplateFilter("all");
    setSelectedIds([]);
    setShowUnpairedOnly(false);
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


  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    listAllPairs()
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
      setSelectedIds((prev) => {
        const base = prev.length ? prev : [];
        const merged = Array.from(new Set([...base, ...filteredInitial]));
        return merged;
      });
      return;
    }
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
  const exportTemplate =
    exportTarget && cardTemplatesById[exportTarget.templateId]
      ? cardTemplatesById[exportTarget.templateId]
      : null;
  const exportCardData = exportTarget ? cardRecordToCardData(exportTarget) : undefined;
  const cardById = useMemo(() => {
    const map = new Map<string, CardRecord>();
    cards.forEach((card) => {
      map.set(card.id, card);
    });
    return map;
  }, [cards]);
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
    const resolveThumb = (card: CardRecord): StockpileCardThumb => ({
      id: card.id,
      thumbnailBlob: card.thumbnailBlob ?? null,
      templateThumbSrc: cardTemplatesById[card.templateId]?.thumbnail?.src ?? null,
      name: card.name ?? card.title ?? "",
    });

    return filteredCards.map((card) => {
      const templateMeta = cardTemplatesById[card.templateId];
      const effectiveFace = (card.face ?? templateMeta?.defaultFace ?? "front") as "front" | "back";
      const pairedBackId = backByFrontId.get(card.id) ?? null;
      const pairedBack = pairedBackId ? (cardById.get(pairedBackId) ?? null) : null;
      const pairedFronts = pairedByTargetId.get(card.id) ?? [];
      const pairedFrontThumbs = pairedFronts.map((paired) => resolveThumb(paired));
      const isPairingConflict = Boolean(
        isPairFronts && pairedBackId && pairedBackId !== activeBackId,
      );
      const conflictPairedName = isPairingConflict
        ? (pairedBack?.title ?? pairedBack?.name ?? "Untitled card")
        : undefined;
      const conflictLabel = isPairingConflict ? t("warning.alreadyPairedWith") : undefined;
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
        templateThumbSrc: templateMeta?.thumbnail?.src ?? null,
        paired: {
          back: pairedBack ? resolveThumb(pairedBack) : null,
          fronts: pairedFrontThumbs,
          frontsVisible: pairedFrontThumbs.slice(0, 3),
          frontsOverflow: Math.max(0, pairedFrontThumbs.length - 3),
        },
        isSelected: selectedIds.includes(card.id),
        isPairingConflict,
        conflictPairedName,
        conflictLabel,
      };
    });
  }, [
    filteredCards,
    selectedIds,
    templateFilterLabelMap,
    cardById,
    pairedByTargetId,
    backByFrontId,
    isPairFronts,
    activeBackId,
    t,
  ]);
  const cardActions: StockpileCardActions = useMemo(
    () => ({
      onCardClick: (id, event, isPairMode, isPairingConflict) => {
        if (isPairMode) {
          setSelectedIds((prev) => {
            const next = prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id];
            if (isPairingConflict && next.includes(id)) {
              setConflictPopoverCardId(id);
            } else if (isPairingConflict && !next.includes(id)) {
              setConflictPopoverCardId((current) => (current === id ? null : current));
            }
            return next;
          });
          return;
        }
        const allowMulti = event.metaKey || event.ctrlKey;
        if (allowMulti) {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((cardId) => cardId !== id) : [...prev, id],
          );
          return;
        }
        setSelectedIds([id]);
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
      onConflictHoverEnter: (id) => {
        if (conflictHoverTimeoutRef.current) {
          window.clearTimeout(conflictHoverTimeoutRef.current);
        }
        setConflictPopoverCardId(id);
      },
      onConflictHoverLeave: (id) => {
        if (conflictHoverTimeoutRef.current) {
          window.clearTimeout(conflictHoverTimeoutRef.current);
        }
        conflictHoverTimeoutRef.current = window.setTimeout(() => {
          setConflictPopoverCardId((prev) => (prev === id ? null : prev));
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
    !isExporting &&
    exportCards.length > 0 &&
    (activeFilter.type === "collection" ||
      ((activeFilter.type === "all" || activeFilter.type === "unfiled") &&
        selectedVisibleCards.length > 0));
  const exportCount = exportCards.length;
  const exportLabel = isExporting
    ? t("actions.exporting")
    : activeFilter.type === "collection" && selectedVisibleCards.length === 0
      ? `${t("actions.exportAll")} ${t("actions.fromThisCollection")}`
      : activeFilter.type === "collection"
        ? `${t("actions.export")} (${exportCount}) ${t("actions.fromThisCollection")}`
        : `${t("actions.export")} (${exportCount})`;
  const exportCollectionName = activeCollection?.name;
  const exportTitle = exportCollectionName
    ? `${t("status.exportingImagesFrom")} ${exportCollectionName} (${exportTotal})`
    : `${t("status.exportingImages")} (${exportTotal})`;

  const handleExportCards = async (
    cardsToExport: CardRecord[],
    options?: { skipIds?: Set<string>; skipNotes?: Map<string, string>; skipPrecheck?: boolean },
  ) => {
    if (!cardsToExport.length) {
      window.alert(t("alert.selectCardToExport"));
      return;
    }

    const skipIds = options?.skipIds ?? new Set<string>();
    const skipNotes = options?.skipNotes ?? new Map<string, string>();

    if (ENABLE_MISSING_ASSET_CHECKS && !options?.skipPrecheck) {
      const report = await buildMissingAssetsReport(cardsToExport);
      if (report.length > 0) {
        const nextSkipIds = new Set(report.map((entry) => entry.cardId));
        const nextSkipNotes = new Map<string, string>();
        report.forEach((entry) => {
          const missingSummary = entry.missing
            .map((asset) => `${asset.label} asset \"${asset.name}\" (id=${asset.id})`)
            .join(", ");
          nextSkipNotes.set(
            entry.cardId,
            `Card \"${entry.title}\" (id=${entry.cardId}, template=${entry.templateId}, face=${entry.face}) could not be exported because the ${missingSummary}.`,
          );
        });
        setMissingAssetsPrompt({
          cards: cardsToExport,
          report,
          skipIds: nextSkipIds,
          skipNotes: nextSkipNotes,
        });
        return;
      }
    }

    const exportableCount = cardsToExport.filter((card) => !skipIds.has(card.id)).length;
    setIsExporting(true);
    setExportTotal(exportableCount);
    setExportProgress(0);
    setExportCancelled(false);
    cancelExportRef.current = false;

    try {
      const result = await runBulkExport({
        cards: cardsToExport,
        previewRef,
        resolveName: (card, usedNames) =>
          resolveExportFileName(
            card.name || card.title || templateFilterLabelMap[card.templateId] || card.templateId,
            usedNames,
          ),
        resolveZipName: () =>
          resolveZipFileName(() => {
            if (activeFilter.type !== "collection") return null;
            return (
              collections.find((collection) => collection.id === activeFilter.id)?.name ?? null
            );
          }),
        shouldCancel: () => cancelExportRef.current,
        onTargetChange: (card) => setExportTarget(card),
        onProgress: (exportedCount) => setExportProgress(exportedCount),
        skipCardIds: skipIds,
        skipCardNotes: skipNotes,
      });

      if (result.status === "no-images") {
        window.alert(t("alert.noImagesExported"));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[StockpileModal] Bulk export failed", error);
      window.alert(t("alert.exportImagesFailed"));
    } finally {
      setIsExporting(false);
      setExportTarget(null);
      setExportTotal(0);
      setExportProgress(0);
      setExportCancelled(false);
      cancelExportRef.current = false;
    }
  };

  const handleBulkExport = async () => {
    if (!canExport) return;

    const { baseIds, pairedIds, previewRows } = resolvePairedExportPlan(exportCards);
    if (pairedIds.length > 0) {
      const baseCount = baseIds.length;
      const exportOnlyLabel =
        activeFilter.type === "collection" && selectedVisibleCards.length === 0
          ? formatMessageWith("label.exportOnlyInCollection", { count: baseCount })
          : formatMessageWith("label.exportOnlySelected", { count: baseCount });
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

  const panel = (
    <>
      <div className={styles.stockpilePanel}>
        <div className={styles.stockpilePanelBody}>
          <StockpileToolbar
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
          <div className={styles.stockpileLayout}>
            <StockpileSidebar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              isPairMode={isPairMode}
              showMissingArtworkOnly={showMissingArtworkOnly}
              collectionsWithMissingArtwork={collectionsWithMissingArtwork}
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              recentCardsCount={recentCards.length}
              overallCount={overallCount}
              unfiledCount={unfiledCount}
              visibleCollections={visibleCollections}
              collectionCounts={collectionCounts}
              selectedCountByCollection={selectedCountByCollection}
            />
            <div className={styles.stockpileContentPane}>
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
                    <StockpileAddToCollectionController
                      collections={collections}
                      activeFilter={activeFilter}
                      visibleSelectedIds={visibleSelectedIds}
                      onCollectionsUpdated={setCollections}
                    />
                  }
                  onRemoveFromCollection={async () => {
                    const target = collections.find((item) => item.id === activeFilter.id);
                    if (!target) return;
                    try {
                      const remaining = target.cardIds.filter((id) => !selectedIds.includes(id));
                      await updateCollection(target.id, { cardIds: remaining });
                      const refreshed = await listCollections();
                      setCollections(refreshed);
                      setSelectedIds([]);
                    } catch (error) {
                      // eslint-disable-next-line no-console
                      console.error("[StockpileModal] Failed to remove from collection", error);
                    }
                  }}
                  onDeleteCards={() => {
                    if (!selectedIds.length) return;
                    const ids = [...selectedIds];
                    setConfirmDialog({
                      title: t("confirm.deleteCardsTitle"),
                      body: `${t("confirm.deleteCardsBodyPrefix")} ${ids.length} ${
                        ids.length === 1 ? t("label.card") : t("label.cards")
                      } ${t("confirm.deleteCardsBodySuffix")}`,
                      confirmLabel:
                        ids.length > 1 ? `${t("actions.delete")} (${ids.length})` : t("actions.delete"),
                      onConfirm: async () => {
                        try {
                          await Promise.all(ids.map((id) => deletePairsForFace(id)));
                          await deleteCards(ids);
                          const idSet = new Set(ids);
                          (Object.keys(activeCardIdByTemplate) as TemplateId[]).forEach(
                            (templateId) => {
                              const activeId = activeCardIdByTemplate[templateId];
                              if (!activeId || !idSet.has(activeId)) return;
                              setActiveCard(templateId, null, null);
                              setCardDraft(templateId, createDefaultCardData(templateId));
                              setTemplateDirty(templateId, false);
                            },
                          );
                          const updates = collections
                            .map((collection) => {
                              const nextCardIds = collection.cardIds.filter((id) => !idSet.has(id));
                              return nextCardIds.length === collection.cardIds.length
                                ? null
                                : { id: collection.id, cardIds: nextCardIds };
                            })
                            .filter(Boolean) as Array<{ id: string; cardIds: string[] }>;
                          await Promise.all(
                            updates.map((update) =>
                              updateCollection(update.id, { cardIds: update.cardIds }),
                            ),
                          );
                          const refreshed = await listCards({ status: "saved" });
                          setCards(refreshed);
                          const refreshedCollections = await listCollections();
                          setCollections(refreshedCollections);
                          setSelectedIds([]);
                        } catch (error) {
                          // eslint-disable-next-line no-console
                          console.error("[StockpileModal] Failed to delete card", error);
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
              <StockpileContentPane
                filteredCards={filteredCards}
                search={search}
                activeFilter={activeFilter}
                templateFilter={templateFilter}
                totalCount={totalCount}
                filterLabel={filterLabel}
                isTableView={isTableView}
                cardViews={cardViews}
                cardActions={cardActions}
                conflictPopoverCardId={conflictPopoverCardId}
                isPairMode={isPairMode}
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
            collectionControls={
              <StockpileCollectionController
                activeFilter={activeFilter}
                collections={collections}
                onCollectionsUpdated={setCollections}
                onActiveFilterChange={setActiveFilter}
              />
            }
            onBulkExport={handleBulkExport}
            canExport={canExport}
            exportLabel={exportLabel}
            selectedCard={selectedCard}
            hasMultiSelection={hasMultiSelection}
            onLoadSelectedCard={() => {
              if (!selectedCard || !onLoadCard) return;
              onLoadCard(selectedCard);
              onClose();
            }}
          />
        </div>
      </div>
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
      {isOpen && exportTarget && exportTemplate ? (
        <div className={styles.bulkExportPreview} aria-hidden="true">
          <CardPreview
            ref={previewRef}
            templateId={exportTemplate.id}
            templateName={exportTemplate.name}
            backgroundSrc={exportTemplate.background}
            cardData={exportCardData}
          />
        </div>
      ) : null}
      <StockpileExportPairPrompt
        exportPairPrompt={exportPairPrompt}
        onClose={() => setExportPairPrompt(null)}
        cardById={cardById}
        onExportCards={(cards) => {
          void handleExportCards(cards);
        }}
      />
      <ExportProgressOverlay
        isOpen={isExporting}
        title={exportTitle}
        progress={exportProgress}
        total={exportTotal}
        exportCancelled={exportCancelled}
        onCancel={() => {
          cancelExportRef.current = true;
          setExportCancelled(true);
        }}
      />
      <StockpileConfirmModal confirmDialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
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
