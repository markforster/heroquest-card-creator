"use client";

import type {
  BoardConfig,
  DnDState,
} from "@/components/Decks/detail/boards/deck-board-internal-types";
import type { BoardId, GroupId, SetId } from "@/components/Decks/detail/boards/deck-board-types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isSourceEphemeralSetId(setId: SetId): boolean {
  return setId.startsWith("ephemeral:source:");
}

export function isEmptySlotEphemeralSetId(setId: SetId): boolean {
  return setId.startsWith("ephemeral:empty-slot:group:");
}

export function createEmptySlotEphemeralSetId(groupId: GroupId): SetId {
  return `ephemeral:empty-slot:group:${groupId}`;
}

export function pruneEmptySlotFromGroup(items: SetId[]): SetId[] {
  return items.filter((id) => !isEmptySlotEphemeralSetId(id));
}

export function countRenderableSets(items: SetId[]): number {
  return items.filter((id) => !isEmptySlotEphemeralSetId(id)).length;
}

export function stripEphemeralItems(state: DnDState): DnDState {
  const nextItemsByContainer: Record<GroupId, SetId[]> = {};
  Object.keys(state.itemsByContainer).forEach((containerId) => {
    nextItemsByContainer[containerId] = (state.itemsByContainer[containerId] ?? []).filter(
      (id) => state.itemsById[id]?.ephemeralKind !== "source",
    );
  });
  const nextItemsById = { ...state.itemsById };
  Object.keys(state.itemsById).forEach((itemId) => {
    if (state.itemsById[itemId]?.ephemeralKind === "source") {
      delete nextItemsById[itemId];
    }
  });
  return {
    ...state,
    itemsByGroup: nextItemsByContainer,
    itemsByContainer: nextItemsByContainer,
    itemsById: nextItemsById,
  };
}

export function withManagedEmptySlots(state: DnDState, groupIds: Array<GroupId | null>): DnDState {
  const managedGroupIds = Array.from(new Set(groupIds.filter(Boolean) as GroupId[])).filter(
    (groupId) => state.groupToBoard[groupId] === "groups",
  );
  if (managedGroupIds.length === 0) return state;

  let didChange = false;
  const nextItemsByGroup: Record<GroupId, SetId[]> = { ...state.itemsByGroup };
  const nextItemsByContainer: Record<GroupId, SetId[]> = { ...state.itemsByContainer };
  const nextItemsById = { ...state.itemsById };

  managedGroupIds.forEach((groupId) => {
    const items = nextItemsByGroup[groupId] ?? [];
    const hasOnlyTemporary = items.filter((id) => !isEmptySlotEphemeralSetId(id)).length === 0;
    const slotId = createEmptySlotEphemeralSetId(groupId);
    const hasSlot = items.includes(slotId);

    if (hasOnlyTemporary && !hasSlot) {
      const withSlot = [...pruneEmptySlotFromGroup(items), slotId];
      nextItemsByGroup[groupId] = withSlot;
      nextItemsByContainer[groupId] = withSlot;
      nextItemsById[slotId] = {
        uiItemId: slotId,
        kind: "set",
        ephemeralKind: "empty-slot",
        face: "back",
        sourceCardId: null,
        persistedId: null,
        isEphemeral: true,
      };
      didChange = true;
      return;
    }

    if (!hasOnlyTemporary && hasSlot) {
      const withoutSlot = pruneEmptySlotFromGroup(items);
      nextItemsByGroup[groupId] = withoutSlot;
      nextItemsByContainer[groupId] = withoutSlot;
      delete nextItemsById[slotId];
      didChange = true;
    }
  });

  if (!didChange) return state;
  return {
    ...state,
    itemsByGroup: nextItemsByGroup,
    itemsByContainer: nextItemsByContainer,
    itemsById: nextItemsById,
  };
}

export function findContainerByItemId(state: DnDState, setId: SetId): GroupId | null {
  const containerId = Object.keys(state.itemsByContainer).find((candidate) =>
    state.itemsByContainer[candidate]?.includes(setId),
  );
  return containerId ?? null;
}

export function moveEphemeralToContainer(
  state: DnDState,
  ephemeralId: SetId,
  targetContainerId: GroupId,
  targetIndex: number,
): DnDState {
  const nextItemsByContainer: Record<GroupId, SetId[]> = {};
  Object.keys(state.itemsByContainer).forEach((containerId) => {
    nextItemsByContainer[containerId] = (state.itemsByContainer[containerId] ?? []).filter(
      (id) => id !== ephemeralId,
    );
  });
  const targetItems = nextItemsByContainer[targetContainerId] ?? [];
  const index = clamp(targetIndex, 0, targetItems.length);
  targetItems.splice(index, 0, ephemeralId);
  nextItemsByContainer[targetContainerId] = targetItems;
  return {
    ...state,
    itemsByGroup: nextItemsByContainer,
    itemsByContainer: nextItemsByContainer,
  };
}

export function normalizeAfterDrop(
  current: DnDState,
  tempGroupId: GroupId | null,
  boardConfigs: Record<BoardId, BoardConfig>,
): DnDState {
  const nextGroupOrderByBoard: DnDState["groupOrderByBoard"] = {
    groups: [],
    entries: [],
    source: [],
  };
  const nextItemsByGroup: DnDState["itemsByGroup"] = {};
  const nextGroupToBoard: DnDState["groupToBoard"] = {};
  const nextContainersById: DnDState["containersById"] = {};
  const nextItemsById: DnDState["itemsById"] = { ...current.itemsById };

  (Object.keys(current.groupOrderByBoard) as BoardId[]).forEach((boardId) => {
    const config = boardConfigs[boardId];
    current.groupOrderByBoard[boardId].forEach((groupId) => {
      const sets = (current.itemsByGroup[groupId] ?? []).filter((id) => !isEmptySlotEphemeralSetId(id));
      const keepEmpty = !config.allowMultipleGroups;
      if (sets.length > 0 || keepEmpty || groupId === tempGroupId) {
        nextGroupOrderByBoard[boardId].push(groupId);
        nextGroupToBoard[groupId] = boardId;
        nextItemsByGroup[groupId] = current.itemsByGroup[groupId] ?? [];
        if (current.containersById[groupId]) {
          nextContainersById[groupId] = current.containersById[groupId];
        }
      }
    });
  });

  Object.keys(nextItemsById).forEach((itemId) => {
    const stillPresent = Object.values(nextItemsByGroup).some((items) => items.includes(itemId));
    if (!stillPresent && nextItemsById[itemId]?.isEphemeral) {
      delete nextItemsById[itemId];
    }
  });

  return {
    groupOrderByBoard: nextGroupOrderByBoard,
    itemsByGroup: nextItemsByGroup,
    groupToBoard: nextGroupToBoard,
    containerOrderByBoard: nextGroupOrderByBoard,
    itemsByContainer: nextItemsByGroup,
    containersById: nextContainersById,
    itemsById: nextItemsById,
  };
}
