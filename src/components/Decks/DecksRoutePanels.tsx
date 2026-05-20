"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { apiClient } from "@/api/client";
import DeckDetailPanel from "@/components/Decks/DeckDetailPanel";
import { DeckExportProvider } from "@/components/Decks/context/DeckExportContext";
import { resolveDeckExportFaceIds } from "@/components/Decks/deck-export";
import DecksGridPanel from "@/components/Decks/DecksGridPanel";
import { useDeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckDetailState } from "@/components/Decks/hooks/useDeckDetailState";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";
import { useDeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import {
  useBulkCardExport,
  type MissingAssetsExportPrompt,
} from "@/components/Export/hooks/useBulkCardExport";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import StockpileMissingAssetsModal from "@/components/Stockpile/StockpileMissingAssetsModal";
import { resolveExportFileName, resolveZipFileName } from "@/components/Stockpile/stockpile-utils";
import { useI18n } from "@/i18n/I18nProvider";
import formatMessageWith from "@/lib/format-message-with";

export default function DecksRoutePanels() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const formatMessage = useMemo(
    () => (key: string, vars: Record<string, string | number>) =>
      formatMessageWith(t as never, key as never, vars),
    [t],
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { deckId, setId: routeSetId, entryId: routeEntryId } = useParams();
  const { openStockpile } = useAppActions();
  const mutations = useDeckMutations();
  const exportFlow = useBulkCardExport();
  const [missingAssetsPrompt, setMissingAssetsPrompt] = useState<MissingAssetsExportPrompt | null>(
    null,
  );
  const [pendingExportContext, setPendingExportContext] = useState<{
    deckId: string;
    scope: "decks_grid" | "deck_detail";
  } | null>(null);

  const isDeckDetail = Boolean(deckId);
  const isDecksIndex = !isDeckDetail;

  const detail = useDeckDetailState(deckId ?? null);
  const selectionModel = useDeckDetailSelectionModel(deckId ?? null);
  const entriesModel = useDeckSetEntriesModel(selectionModel.selectedSetId);
  const isSelectionPathSyncDisabledRef = useRef(false);
  const hydratedSetRouteKeyRef = useRef<string | null>(null);
  const hydratedEntryRouteKeyRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const startDeckExport = useCallback(
    async (
      deckIdValue: string,
      scope: "decks_grid" | "deck_detail",
      options?: { skipIds?: Set<string>; skipNotes?: Map<string, string>; skipPrecheck?: boolean },
    ) => {
      const { faceIds } = await resolveDeckExportFaceIds(deckIdValue);
      if (!faceIds.length) {
        window.alert(t("alert.selectCardToExport"));
        return;
      }
      const records = await Promise.all(
        faceIds.map(async (id) => {
          try {
            return await apiClient.getCard({ params: { id } });
          } catch {
            return null;
          }
        }),
      );
      const cards = records.filter((card): card is NonNullable<typeof card> => Boolean(card));
      if (!cards.length) {
        window.alert(t("alert.noImagesExported"));
        return;
      }
      track("export_started", { scope });
      const result = await exportFlow.startBulkCardExport({
        cards,
        skipIds: options?.skipIds,
        skipNotes: options?.skipNotes,
        skipPrecheck: options?.skipPrecheck,
        resolveName: (card, usedNames) =>
          resolveExportFileName(card.name || card.title || card.templateId, usedNames),
        resolveZipName: () => resolveZipFileName(() => null),
      });
      if (result.status === "missing-assets") {
        setPendingExportContext({ deckId: deckIdValue, scope });
        setMissingAssetsPrompt(result.prompt);
      }
    },
    [exportFlow, t, track],
  );

  const createSetFromBackFace = async (
    deckIdValue: string,
    groupId: string,
    backFaceId: string,
  ) => {
    return mutations.createSetFromBackFace(
      deckIdValue,
      groupId,
      backFaceId,
      t("decks.defaultSetTitle"),
    );
  };

  const { dragState, dndHandlers, groupRowRef, entriesRowRef } = useDecksDragController({
    deckId: deckId ?? null,
    orderedGroups: selectionModel.orderedGroups,
    sets: selectionModel.sets,
    groupBySetId: selectionModel.groupBySetId,
    selectedGroupId: selectionModel.selectedGroupId,
    selectedSetId: selectionModel.selectedSetId,
    activeSetId: selectionModel.selectedSetId,
    entries: entriesModel.entries,
    entryFrontIdByEntryId: entriesModel.entryFrontIdByEntryId,
    setSelectedGroupId: selectionModel.setSelectedGroupId,
    createSetFromBackFace,
    addFrontFaceToSet: async (setId, frontFaceId) => entriesModel.addFront(frontFaceId, setId),
    reorderSetEntries: mutations.reorderEntries,
    reorderSetEntriesOptimistic: async (setId, orderedEntryIds) =>
      entriesModel.reorderEntriesOptimistic(orderedEntryIds, setId),
    applyOptimisticSets: selectionModel.applyOptimisticSets,
    createDeckGroup: async (targetDeckId) =>
      mutations.createGroup(targetDeckId, t("decks.defaultGroupTitle")),
    reorderDeckGroups: mutations.reorderGroups,
    reorderDeckSets: mutations.reorderSets,
    updateDeckSetGroup: mutations.updateSetGroup,
    deleteDeckSet: mutations.deleteSet,
    deleteDeckGroup: mutations.deleteGroup,
    reloadStructure: selectionModel.reloadStructure,
    refreshSetEntries: async (setId) => entriesModel.refreshEntries(setId),
  });
  const isDraggingAny =
    dragState.isBackFaceDragActive ||
    dragState.isFrontFaceDragActive ||
    dragState.isEntryDragActive ||
    dragState.isGroupDragActive ||
    dragState.isSetDragActive;

  useEffect(() => {
    if (!deckId || !routeSetId) {
      hydratedSetRouteKeyRef.current = null;
      return;
    }
    if (!deckId || isDraggingAny) return;
    const routeKey = `${deckId}:${routeSetId}`;
    if (hydratedSetRouteKeyRef.current === routeKey) return;
    const routeSet = selectionModel.setById.get(routeSetId);
    if (!routeSet) {
      if (selectionModel.sets.length > 0) {
        navigate(buildDeckDeepLink({ deckId }), { replace: true });
        hydratedSetRouteKeyRef.current = routeKey;
      }
      return;
    }
    if (selectionModel.selectedSetId !== routeSet.id) {
      isSelectionPathSyncDisabledRef.current = true;
      selectionModel.selectSet(routeSet);
      return;
    }
    hydratedSetRouteKeyRef.current = routeKey;
  }, [
    deckId,
    isDraggingAny,
    navigate,
    routeSetId,
    selectionModel.sets.length,
    selectionModel,
  ]);

  useEffect(() => {
    if (!deckId || !routeSetId || !routeEntryId) {
      hydratedEntryRouteKeyRef.current = null;
      return;
    }
    if (!deckId || isDraggingAny) return;
    if (!selectionModel.selectedSetId) return;
    if (selectionModel.selectedSetId !== routeSetId) return;
    const routeKey = `${deckId}:${routeSetId}:${routeEntryId}`;
    if (hydratedEntryRouteKeyRef.current === routeKey) return;
    const matched = entriesModel.entriesSorted.some((entry) => entry.id === routeEntryId);
    if (!matched) {
      navigate(
        buildDeckDeepLink({ deckId, setId: routeSetId }),
        { replace: true },
      );
      hydratedEntryRouteKeyRef.current = routeKey;
      return;
    }
    if (selectionModel.selectedEntryId !== routeEntryId) {
      isSelectionPathSyncDisabledRef.current = true;
      selectionModel.setSelectedEntryId(routeEntryId);
      return;
    }
    hydratedEntryRouteKeyRef.current = routeKey;
  }, [
    deckId,
    entriesModel.entriesSorted,
    isDraggingAny,
    navigate,
    routeSetId,
    routeEntryId,
    selectionModel,
  ]);

  useEffect(() => {
    if (!deckId || isDraggingAny) return;
    if (routeSetId) {
      const expectedSetHydrationKey = `${deckId}:${routeSetId}`;
      if (hydratedSetRouteKeyRef.current !== expectedSetHydrationKey) {
        return;
      }
    }
    if (routeSetId && routeEntryId) {
      const expectedEntryHydrationKey = `${deckId}:${routeSetId}:${routeEntryId}`;
      if (hydratedEntryRouteKeyRef.current !== expectedEntryHydrationKey) {
        return;
      }
    }
    if (isSelectionPathSyncDisabledRef.current) {
      isSelectionPathSyncDisabledRef.current = false;
      return;
    }
    const target = buildDeckDeepLink({
      deckId,
      setId: selectionModel.selectedSetId,
      entryId: selectionModel.selectedEntryId,
    });
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [
    deckId,
    isDraggingAny,
    location.pathname,
    navigate,
    selectionModel.selectedEntryId,
    selectionModel.selectedSetId,
  ]);

  const handleDeleteSet = async () => {
    if (!detail.pendingDeleteSet) return;
    const wasSelected = selectionModel.selectedSetId === detail.pendingDeleteSet.id;
    const deletedSetGroupId = detail.pendingDeleteSet.groupId;
    await mutations.deleteSet(detail.pendingDeleteSet.id);
    detail.setPendingDeleteSet(null);
    detail.setIsDeleteSetOpen(false);
    await selectionModel.reloadStructure(
      wasSelected ? null : selectionModel.selectedSetId,
      wasSelected && deletedSetGroupId
        ? { suppressSingleSetAutoSelectGroupId: deletedSetGroupId }
        : undefined,
    );
    if (wasSelected) {
      selectionModel.clearSelection();
    }
  };

  const handleDeleteGroup = async () => {
    if (!detail.pendingDeleteGroup) return;
    await mutations.deleteGroup(detail.pendingDeleteGroup.id);
    detail.setPendingDeleteGroup(null);
    detail.setIsDeleteGroupOpen(false);
    await selectionModel.reloadStructure();
  };

  const startRebuildFlow = () => {
    const setId = detail.pendingRebuildSetId;
    if (!setId) return;
    detail.setIsRebuildConfirmOpen(false);
    const currentSet = selectionModel.sets.find((set) => set.id === setId);
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
            await mutations.rebuildSetBack(currentSet.id, newBackFaceId, frontIds);
            await selectionModel.reloadStructure(currentSet.id);
          },
        });
      },
    });
  };

  const exportProviderValue = useMemo(() => ({ exportDeck: startDeckExport }), [startDeckExport]);

  return (
    <DeckExportProvider value={exportProviderValue}>
      {isDecksIndex ? (
        <DecksGridPanel />
      ) : (
        <DeckDetailPanel
          deckId={deckId ?? null}
          actions={{
            handleDeleteSet,
            handleDeleteGroup,
            startRebuildFlow,
            navigateToDecks: () => navigate("/decks"),
            onOpenCardEditor: (cardId) => navigate(`/cards/${cardId}`),
            makeSelectedSetKeyCard: async (setId) => {
              if (!deckId) return;
              await mutations.setDeckKeySet(deckId, setId);
            },
            deleteSetFromGroupCard: async (setId) => {
              const targetSet = selectionModel.setById.get(setId);
              if (!targetSet) return;
              detail.setPendingDeleteSet(targetSet);
              detail.setIsDeleteSetOpen(true);
            },
            deleteDeck: async (id) => {
              await mutations.deleteDecks([id]);
            },
          }}
          drag={dragState}
          dndProps={{ sensors, ...dndHandlers }}
          modalState={{
            isDeleteDeckOpen: detail.isDeleteDeckOpen,
            isDeleteSetOpen: detail.isDeleteSetOpen,
            isDeleteGroupOpen: detail.isDeleteGroupOpen,
            isRebuildConfirmOpen: detail.isRebuildConfirmOpen,
          }}
          modalActions={{
            setIsDeleteDeckOpen: detail.setIsDeleteDeckOpen,
            setIsDeleteSetOpen: detail.setIsDeleteSetOpen,
            setIsDeleteGroupOpen: detail.setIsDeleteGroupOpen,
            setPendingDeleteSet: detail.setPendingDeleteSet,
            setPendingDeleteGroup: detail.setPendingDeleteGroup,
            setIsRebuildConfirmOpen: detail.setIsRebuildConfirmOpen,
            setPendingRebuildSetId: detail.setPendingRebuildSetId,
          }}
          groupRowRef={groupRowRef}
          entriesRowRef={entriesRowRef}
          selectionModel={selectionModel}
          entriesModel={entriesModel}
        />
      )}
      {exportFlow.exportUi}
      <StockpileMissingAssetsModal
        prompt={missingAssetsPrompt}
        onConfirm={async () => {
          const prompt = missingAssetsPrompt;
          const pending = pendingExportContext;
          if (!prompt || !pending) return;
          setMissingAssetsPrompt(null);
          setPendingExportContext(null);
          await startDeckExport(pending.deckId, pending.scope, {
            skipIds: prompt.skipIds,
            skipNotes: prompt.skipNotes,
            skipPrecheck: true,
          });
        }}
        onCancel={() => {
          setMissingAssetsPrompt(null);
          setPendingExportContext(null);
        }}
      />
    </DeckExportProvider>
  );
}
