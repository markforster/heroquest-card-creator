"use client";

import { useCallback, useEffect } from "react";
import { apiClient } from "@/api/client";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import {
  BOARD_ROUTING_META_BY_ID,
  DefaultSetThumbnailContent,
  DeckSortableBoardView,
  type DeckSortableBoardViewModel,
  useDeckMockDnd,
  useDeckSortableBoardViewModel,
} from "./DeckBoardsCore";

async function deleteGroupIfEmpty(groupId: string, isEmpty: boolean): Promise<void> {
  if (!isEmpty || !groupId) return;
  try {
    await apiClient.deleteDeckGroup(undefined, { params: { groupId } });
  } catch {
    // Non-fatal; reload will re-sync.
  }
}

export default function DeckGroupsBoardController({ deckId }: { deckId: string | null }) {
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, state }) => {
      const rawSetId = setId.startsWith("set:") ? setId.slice(4) : null;
      const cardId = rawSetId ? selection?.setById.get(rawSetId)?.backFaceId : null;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={cardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [selection],
  );
  const model = useDeckSortableBoardViewModel("groups", BOARD_ROUTING_META_BY_ID.groups, {
    renderSetContent,
    onSetClick: (setUiId, groupUiId) => {
      if (!selection) return;
      if (!setUiId.startsWith("set:")) return;
      if (!groupUiId.startsWith("group:")) return;
      const setId = setUiId.slice(4);
      const groupId = groupUiId.slice(6);
      const setRecord = selection.setById.get(setId);
      if (!setRecord) return;
      selection.selectGroup(groupId);
      selection.selectSet(setRecord);
    },
  });

  useEffect(() => {
    if (!selection) return () => undefined;
    return registerDropHandler("groups-controller", async (event) => {
      if (event.kind === "GROUPS_REORDER_SETS") {
        const isCrossGroup = event.sourceGroupId !== event.targetGroupId;
        if (isCrossGroup) {
          await apiClient.updateDeckSet(
            { groupId: event.targetGroupId },
            { params: { setId: event.setId } },
          );
        }
        if (event.orderedTargetSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedTargetSetIds },
            { params: { setId: event.orderedTargetSetIds[0] } },
          );
        }
        if (isCrossGroup && event.orderedSourceSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedSourceSetIds },
            { params: { setId: event.orderedSourceSetIds[0] } },
          );
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SET_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await apiClient.createDeckGroup(
          { title: "New Group" },
          { params: { deckId } },
        );
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await apiClient.reorderDeckGroups({ orderedGroupIds: nextGroupOrder }, { params: { deckId } });
        await apiClient.updateDeckSet({ groupId: createdGroup.id }, { params: { setId: event.setId } });
        await apiClient.reorderDeckSets({ orderedSetIds: [event.setId] }, { params: { setId: event.setId } });
        if (event.orderedSourceSetIds.length > 0) {
          await apiClient.reorderDeckSets(
            { orderedSetIds: event.orderedSourceSetIds },
            { params: { setId: event.orderedSourceSetIds[0] } },
          );
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const created = await apiClient.createDeckSet({
          deckId,
          groupId: event.targetGroupId,
          backFaceId: event.backFaceId,
          title: "New Set",
          description: null,
        });
        const orderedTargetSetIds = selection.sets
          .filter((set) => set.groupId === event.targetGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((set) => set.id);
        const clampedIndex = Math.max(0, Math.min(event.targetIndex, orderedTargetSetIds.length));
        const nextOrdered = orderedTargetSetIds.slice();
        nextOrdered.splice(clampedIndex, 0, created.id);
        await apiClient.reorderDeckSets({ orderedSetIds: nextOrdered }, { params: { setId: created.id } });
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await apiClient.createDeckGroup(
          { title: "New Group" },
          { params: { deckId } },
        );
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await apiClient.reorderDeckGroups({ orderedGroupIds: nextGroupOrder }, { params: { deckId } });
        const createdSet = await apiClient.createDeckSet({
          deckId,
          groupId: createdGroup.id,
          backFaceId: event.backFaceId,
          title: "New Set",
          description: null,
        });
        await apiClient.reorderDeckSets({ orderedSetIds: [createdSet.id] }, { params: { setId: createdSet.id } });
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      return null;
    });
  }, [deckId, registerDropHandler, selection]);

  return <DeckSortableBoardView model={model} layoutMode="content" />;
}
