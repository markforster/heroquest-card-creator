"use client";

import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import DeckDetailPanel from "@/components/Decks/DeckDetailPanel";
import DecksGridPanel from "@/components/Decks/DecksGridPanel";
import { useDeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckDetailState } from "@/components/Decks/hooks/useDeckDetailState";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";
import { useDeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useI18n } from "@/i18n/I18nProvider";
import formatMessageWith from "@/lib/format-message-with";

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
  const mutations = useDeckMutations();

  const isDeckDetail = Boolean(deckId);
  const isDecksIndex = !isDeckDetail;

  const detail = useDeckDetailState(deckId ?? null);
  const selectionModel = useDeckDetailSelectionModel(deckId ?? null);
  const entriesModel = useDeckSetEntriesModel(selectionModel.selectedSetId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
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

  const handleDeleteSet = async () => {
    if (!detail.pendingDeleteSet) return;
    await mutations.deleteSet(detail.pendingDeleteSet.id);
    detail.setPendingDeleteSet(null);
    detail.setIsDeleteSetOpen(false);
    await selectionModel.reloadStructure();
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

  if (isDecksIndex) {
    return <DecksGridPanel />;
  }

  return (
    <DeckDetailPanel
      deckId={deckId ?? null}
      actions={{
        handleDeleteSet,
        handleDeleteGroup,
        startRebuildFlow,
        navigateToDecks: () => navigate("/decks"),
        onOpenCardEditor: (cardId) => navigate(`/cards/${cardId}`),
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
  );
}
