"use client";

import { useMemo } from "react";

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
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";
import { orderDeckPreviewCandidateIds } from "@/components/Decks/deck-preview";
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
import { useDeckBoardsModels } from "./detail/DeckGroupsSection2.models";

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
  const boardModels = useDeckBoardsModels({
    selection: selectionModel,
    entries: entriesModel,
  });
  const deckPreviewCardIds = useMemo(() => {
    const orderedGroups = [...selectionModel.orderedGroups].sort((a, b) => a.sortIndex - b.sortIndex);
    const setsByGroup = new Map<string, typeof selectionModel.sets>();
    selectionModel.sets.forEach((set) => {
      const list = setsByGroup.get(set.groupId) ?? [];
      list.push(set);
      setsByGroup.set(set.groupId, list);
    });
    setsByGroup.forEach((list, groupId) => {
      setsByGroup.set(groupId, [...list].sort((a, b) => a.sortIndex - b.sortIndex));
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
  }, [keySetId, selectionModel.orderedGroups, selectionModel.sets]);

  return (
    <>
      <DeckMockDndProvider boardModels={boardModels}>
        <section className={`${styles.leftPanel} ${styles.decksPanel}`}>
          <div className={styles.deckRoutePanel}>
            <DeckDetailHeader
              deckId={deckId}
              deckTitle={deckTitle}
              deckPreviewCardIds={deckPreviewCardIds}
            />

            <DeckDetailSelectionProvider model={selectionModel}>
              <DeckSetEntriesProvider model={entriesModel}>
                <div className={styles.deckRouteMiddle}>
                  <DeckGroupsBoardController
                    deckId={deckId}
                    keySetId={keySetId}
                    enableFanLayout
                    onRequestDeleteSet={actions.deleteSetFromGroupCard}
                    onOpenCardEditor={actions.onOpenCardEditor}
                  />
                  <DeckEntriesBoardController onOpenCardEditor={actions.onOpenCardEditor} />
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
            deckId={deckId}
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
