"use client";

import { useMemo } from "react";
import { apiClient } from "@/api/client";

import styles from "@/app/page.module.css";
import { DeckDetailSelectionProvider } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import {
  DeckRightPanelProvider,
  useDeckRightPanel,
} from "@/components/Decks/detail/context/DeckRightPanelContext";
import { DeckSetEntriesProvider } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import DeckBacksPanel from "@/components/Decks/detail/DeckBacksPanel";
import DeckDetailHeader from "@/components/Decks/detail/DeckDetailHeader";
import DeckDetailModals from "@/components/Decks/detail/DeckDetailModals";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";
import { useDeckHeaderModel } from "@/components/Decks/hooks/useDeckHeaderModel";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";
import type {
  DeckDetailActionHandlers,
  DeckDetailDndProps,
  DeckDetailDragState,
  DeckDetailModalActions,
  DeckDetailModalState,
} from "@/components/Decks/types/deck-detail";
import DeckGroupsBoardController, {
  DeckEntriesBoardController,
  DeckMockDndProvider,
  DeckSourceBoardController,
} from "./detail/DeckGroupsSection2";
import { useDeckBoardsSeedModels } from "./detail/DeckGroupsSection2.seeds";

export type DeckDetailPanelProps = {
  deckId: string | null;
  actions: DeckDetailActionHandlers;
  drag: DeckDetailDragState;
  dndProps: DeckDetailDndProps;
  modalState: DeckDetailModalState;
  modalActions: DeckDetailModalActions;
  groupRowRef: (node: HTMLDivElement | null) => void;
  entriesRowRef: (node: HTMLDivElement | null) => void;
  selectionModel: DeckDetailSelectionModel;
  entriesModel: DeckSetEntriesModel;
};

export default function DeckDetailPanel({
  deckId,
  actions,
  drag,
  dndProps,
  modalState,
  modalActions,
  groupRowRef,
  entriesRowRef,
  selectionModel,
  entriesModel,
}: DeckDetailPanelProps) {
  const { deckTitle, keySetId } = useDeckHeaderModel(deckId);

  return (
    <DeckRightPanelProvider>
      <DeckDetailPanelContent
        deckId={deckId}
        deckTitle={deckTitle}
        keySetId={keySetId}
        actions={actions}
        drag={drag}
        dndProps={dndProps}
        modalState={modalState}
        modalActions={modalActions}
        groupRowRef={groupRowRef}
        entriesRowRef={entriesRowRef}
        selectionModel={selectionModel}
        entriesModel={entriesModel}
      />
    </DeckRightPanelProvider>
  );
}

function DeckDetailPanelContent({
  deckId,
  deckTitle,
  keySetId,
  actions,
  drag,
  dndProps,
  modalState,
  modalActions,
  selectionModel,
  entriesModel,
}: {
  deckId: string | null;
  deckTitle: string;
  keySetId: string | null;
  actions: DeckDetailActionHandlers;
  drag: DeckDetailDragState;
  dndProps: DeckDetailDndProps;
  modalState: DeckDetailModalState;
  modalActions: DeckDetailModalActions;
  groupRowRef: (node: HTMLDivElement | null) => void;
  entriesRowRef: (node: HTMLDivElement | null) => void;
  selectionModel: DeckDetailSelectionModel;
  entriesModel: DeckSetEntriesModel;
}) {
  const { isRightPanelVisible } = useDeckRightPanel();
  const usedBackFaceIds = useMemo(
    () => new Set(selectionModel.sets.map((set) => set.backFaceId)),
    [selectionModel.sets],
  );
  const usedFrontFaceIds = useMemo(
    () =>
      new Set(
        entriesModel.entries
          .map((entry) => entriesModel.entryFrontIdByEntryId.get(entry.id) ?? null)
          .filter((id): id is string => Boolean(id)),
      ),
    [entriesModel.entries, entriesModel.entryFrontIdByEntryId],
  );
  const boardSeeds = useDeckBoardsSeedModels({
    selection: selectionModel,
    entries: entriesModel,
  });
  const deleteEmptySourceGroupIfNeeded = async (
    sourceGroupId: string,
    sourceGroupEmptyAfterDrop: boolean,
  ) => {
    if (!sourceGroupEmptyAfterDrop) return;
    if (!sourceGroupId || sourceGroupId.startsWith("N")) return;
    try {
      await apiClient.deleteDeckGroup(undefined, { params: { groupId: sourceGroupId } });
    } catch {
      // Non-fatal: group may already be removed; reload keeps UI consistent with persisted state.
    }
  };

  return (
    <>
      <DeckMockDndProvider
        boardSeeds={boardSeeds}
        onSetMovedAcrossGroups={async ({ setId, targetGroupId, sourceGroupId, sourceGroupEmptyAfterDrop }) => {
          await apiClient.updateDeckSet({ groupId: targetGroupId }, { params: { setId } });
          await deleteEmptySourceGroupIfNeeded(sourceGroupId, sourceGroupEmptyAfterDrop);
        }}
        onGroupsSetsReordered={async ({
          sourceGroupId,
          targetGroupId,
          orderedTargetSetIds,
          orderedSourceSetIds,
          sourceGroupEmptyAfterDrop,
        }) => {
          if (orderedTargetSetIds.length > 0) {
            await apiClient.reorderDeckSets(
              { orderedSetIds: orderedTargetSetIds },
              { params: { setId: orderedTargetSetIds[0] } },
            );
          }
          if (
            sourceGroupId !== targetGroupId &&
            orderedSourceSetIds.length > 0
          ) {
            await apiClient.reorderDeckSets(
              { orderedSetIds: orderedSourceSetIds },
              { params: { setId: orderedSourceSetIds[0] } },
            );
          }
          await deleteEmptySourceGroupIfNeeded(sourceGroupId, sourceGroupEmptyAfterDrop);
          await selectionModel.reloadStructure(selectionModel.selectedSetId);
        }}
        onSetDroppedToNewGroup={async ({
          setId,
          sourceGroupId,
          targetGroupIndex,
          orderedSourceSetIds,
          sourceGroupEmptyAfterDrop,
        }) => {
          if (!deckId) return;
          const createdGroup = await apiClient.createDeckGroup(
            { title: "New Group" },
            { params: { deckId } },
          );
          const orderedGroupIds = selectionModel.orderedGroups.map((group) => group.id);
          const insertionIndex = Math.max(0, Math.min(targetGroupIndex, orderedGroupIds.length));
          const nextGroupOrder = orderedGroupIds.slice();
          nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
          await apiClient.reorderDeckGroups(
            { orderedGroupIds: nextGroupOrder },
            { params: { deckId } },
          );
          await apiClient.updateDeckSet({ groupId: createdGroup.id }, { params: { setId } });
          await apiClient.reorderDeckSets({ orderedSetIds: [setId] }, { params: { setId } });
          if (orderedSourceSetIds.length > 0) {
            await apiClient.reorderDeckSets(
              { orderedSetIds: orderedSourceSetIds },
              { params: { setId: orderedSourceSetIds[0] } },
            );
          } else if (sourceGroupId) {
            const remainingInSource = selectionModel.sets
              .filter((set) => set.groupId === sourceGroupId && set.id !== setId)
              .sort((a, b) => a.sortIndex - b.sortIndex)
              .map((set) => set.id);
            if (remainingInSource.length > 0) {
              await apiClient.reorderDeckSets(
                { orderedSetIds: remainingInSource },
                { params: { setId: remainingInSource[0] } },
              );
            }
          }
          await deleteEmptySourceGroupIfNeeded(sourceGroupId, sourceGroupEmptyAfterDrop);
          await selectionModel.reloadStructure(selectionModel.selectedSetId);
        }}
        onSourceSetDroppedToGroup={async ({ backFaceId, targetGroupId, targetIndex }) => {
          if (!deckId) return;
          const created = await apiClient.createDeckSet({
            deckId,
            groupId: targetGroupId,
            backFaceId,
            title: "New Set",
            description: null,
          });
          const orderedTargetSetIds = selectionModel.sets
            .filter((set) => set.groupId === targetGroupId)
            .sort((a, b) => a.sortIndex - b.sortIndex)
            .map((set) => set.id);
          const clampedIndex = Math.max(0, Math.min(targetIndex, orderedTargetSetIds.length));
          const nextOrdered = orderedTargetSetIds.slice();
          nextOrdered.splice(clampedIndex, 0, created.id);
          await apiClient.reorderDeckSets(
            { orderedSetIds: nextOrdered },
            { params: { setId: created.id } },
          );
          await selectionModel.reloadStructure(selectionModel.selectedSetId);
        }}
        onSourceSetDroppedToNewGroup={async ({ backFaceId, targetGroupIndex }) => {
          if (!deckId) return;
          const createdGroup = await apiClient.createDeckGroup(
            { title: "New Group" },
            { params: { deckId } },
          );
          const orderedGroupIds = selectionModel.orderedGroups.map((group) => group.id);
          const insertionIndex = Math.max(0, Math.min(targetGroupIndex, orderedGroupIds.length));
          const nextGroupOrder = orderedGroupIds.slice();
          nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
          await apiClient.reorderDeckGroups(
            { orderedGroupIds: nextGroupOrder },
            { params: { deckId } },
          );
          const createdSet = await apiClient.createDeckSet({
            deckId,
            groupId: createdGroup.id,
            backFaceId,
            title: "New Set",
            description: null,
          });
          await apiClient.reorderDeckSets(
            { orderedSetIds: [createdSet.id] },
            { params: { setId: createdSet.id } },
          );
          await selectionModel.reloadStructure(selectionModel.selectedSetId);
        }}
      >
        <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
          <div className={styles.deckRoutePanel}>
            <DeckDetailHeader
              deckId={deckId}
              deckTitle={deckTitle}
              selectedSetId={selectionModel.selectedSetId}
              keySetId={keySetId}
              selectedSetBackFaceId={
                selectionModel.selectedSetId
                  ? (selectionModel.setById.get(selectionModel.selectedSetId)?.backFaceId ?? null)
                  : null
              }
              onConfirmMakeKeyCard={async () => {
                if (!selectionModel.selectedSetId || !deckId) return;
                await actions.makeSelectedSetKeyCard(selectionModel.selectedSetId);
              }}
            />

            <DeckDetailSelectionProvider model={selectionModel}>
              <DeckSetEntriesProvider model={entriesModel}>
                <div className={styles.deckRouteMiddle}>
                  <DeckGroupsBoardController />
                  <DeckEntriesBoardController />
                </div>
              </DeckSetEntriesProvider>
            </DeckDetailSelectionProvider>
          </div>
        </section>
        <aside
          className={`${styles.rightPanel} ${styles.decksRightPanel} ${
            isRightPanelVisible ? styles.decksRightPanelExpanded : styles.decksRightPanelCollapsed
          }`}
        >
          <DeckBacksPanel
            usedBackFaceIds={usedBackFaceIds}
            usedFrontFaceIds={usedFrontFaceIds}
            finalizingBackFaceId={drag.finalizingBackFaceId}
            finalizingFrontFaceId={drag.finalizingFrontFaceId}
            gridOverride={<DeckSourceBoardController />}
          />
        </aside>
      </DeckMockDndProvider>

      <DeckDetailModals
        deckId={deckId}
        state={modalState}
        actions={modalActions}
        onDeleteDeck={actions.deleteDeck}
        onDeleteSet={actions.handleDeleteSet}
        onDeleteGroup={actions.handleDeleteGroup}
        onRebuildConfirm={actions.startRebuildFlow}
        onNavigateToDecks={actions.navigateToDecks}
      />
    </>
  );
}
