"use client";

import { countRenderableSets } from "@/components/Decks/detail/boards/deck-board-dnd-state";
import type {
  BoardConfig,
  BoardModel,
  BoardRoutingMeta,
  DnDState,
  DragRouteToken,
  SourceItemFace,
  UiContainer,
  UiItem,
} from "@/components/Decks/detail/boards/deck-board-internal-types";
import type { BoardId, GroupId, SetId } from "@/components/Decks/detail/boards/deck-board-types";

export function createDnDStateFromModels(
  boardModels: Record<BoardId, BoardModel>,
  boardConfigs: Record<BoardId, BoardConfig>,
): DnDState {
  const containerOrderByBoard: Record<BoardId, GroupId[]> = {
    groups: boardModels.groups.groupIds.slice(),
    entries: boardModels.entries.groupIds.slice(),
    source: boardModels.source.groupIds.slice(),
  };
  const itemsByContainer: Record<GroupId, SetId[]> = {};
  const containersById: Record<GroupId, UiContainer> = {};
  const itemsById: Record<SetId, UiItem> = {};

  (Object.keys(boardModels) as BoardId[]).forEach((boardId) => {
    const model = boardModels[boardId];
    model.groupIds.forEach((groupId) => {
      itemsByContainer[groupId] = (model.itemsByGroup[groupId] ?? []).slice();
      containersById[groupId] = {
        id: groupId,
        boardId,
        role:
          boardId === "groups" ? "group" : boardId === "entries" ? "entries-lane" : "source-lane",
        allowSortWithin: boardConfigs[boardId].allowInGroupSort,
        accepts: model.acceptTokens,
      };
      (model.itemsByGroup[groupId] ?? []).forEach((setId) => {
        if (itemsById[setId]) return;
        if (boardId === "groups") {
          itemsById[setId] = {
            uiItemId: setId,
            kind: "set",
            face: "back",
            sourceCardId: model.setCardIdById[setId] ?? null,
            persistedId: setId.startsWith("set:") ? setId.slice(4) : null,
            isEphemeral: false,
          };
          return;
        }
        if (boardId === "entries") {
          itemsById[setId] = {
            uiItemId: setId,
            kind: "entry",
            face: "front",
            sourceCardId: model.setCardIdById[setId] ?? null,
            persistedId: setId.startsWith("entry:") ? setId.slice(6) : null,
            isEphemeral: false,
          };
          return;
        }
        itemsById[setId] = {
          uiItemId: setId,
          kind: "source-template",
          face: model.sourceItemFaceBySetId?.[setId] ?? null,
          sourceCardId: model.setCardIdById[setId] ?? (setId.startsWith("source:") ? setId.slice(7) : null),
          persistedId: null,
          isEphemeral: false,
        };
      });
    });
  });

  return {
    groupOrderByBoard: containerOrderByBoard,
    itemsByGroup: itemsByContainer,
    groupToBoard: Object.fromEntries(
      Object.keys(containersById).map((containerId) => [containerId, containersById[containerId].boardId]),
    ) as Record<GroupId, BoardId>,
    containerOrderByBoard,
    itemsByContainer,
    containersById,
    itemsById,
  };
}

export function collectLabels(boardModels: Record<BoardId, BoardModel>) {
  const groupLabelsById: Record<GroupId, string> = {};
  const setLabelsById: Record<SetId, string> = {};
  const setCardIdById: Record<SetId, string> = {};

  (Object.keys(boardModels) as BoardId[]).forEach((boardId) => {
    Object.assign(groupLabelsById, boardModels[boardId].groupLabelsById);
    Object.assign(setLabelsById, boardModels[boardId].setLabelsById);
    Object.assign(setCardIdById, boardModels[boardId].setCardIdById);
  });

  return { groupLabelsById, setLabelsById, setCardIdById };
}

export function canRouteDrag({
  sourceBoardId,
  sourceGroupId,
  targetBoardId,
  targetGroupId,
  sameGroup,
  sourceAllowInGroupSort,
  targetAllowDropTarget,
  sourceEmitToken,
  targetAcceptTokens,
  sourceItem,
  targetContainer,
}: {
  sourceBoardId: BoardId | null;
  sourceGroupId: GroupId | null;
  targetBoardId: BoardId | null;
  targetGroupId: GroupId | null;
  sameGroup: boolean;
  sourceAllowInGroupSort: boolean;
  targetAllowDropTarget: boolean;
  sourceEmitToken: DragRouteToken | null;
  targetAcceptTokens: DragRouteToken[] | null;
  sourceItem: UiItem | null;
  targetContainer: UiContainer | null;
}): boolean {
  if (!sourceBoardId || !sourceGroupId || !targetBoardId || !targetGroupId) return false;
  if (sameGroup) return sourceAllowInGroupSort;
  if (sourceBoardId === targetBoardId) {
    return sourceAllowInGroupSort && targetAllowDropTarget;
  }
  if (!targetAllowDropTarget) return false;
  if (!sourceEmitToken) return false;
  if (!targetAcceptTokens) return false;
  if (!targetAcceptTokens.includes(sourceEmitToken)) return false;
  if (sourceItem?.kind === "source-template" && targetContainer) {
    if (sourceItem.face === "back" && !targetContainer.accepts.includes("source-back")) return false;
    if (sourceItem.face === "front" && !targetContainer.accepts.includes("source-front")) return false;
  }
  return true;
}

export function resolveSourceDragToken({
  sourceBoardId,
  sourceSetId,
  sourceRoutingToken,
  sourceItemFaceBySetId,
}: {
  sourceBoardId: BoardId | null;
  sourceSetId: SetId;
  sourceRoutingToken: DragRouteToken | null;
  sourceItemFaceBySetId: Record<SetId, SourceItemFace>;
}): DragRouteToken | null {
  if (sourceBoardId !== "source") return sourceRoutingToken;
  const face = sourceItemFaceBySetId[sourceSetId];
  if (face === "front") return "source-front";
  if (face === "back") return "source-back";
  return null;
}

export function emptyAffordanceState(): Record<BoardId, boolean> {
  return {
    groups: false,
    entries: false,
    source: false,
  };
}

export function computeAffordanceByBoard({
  sourceBoardId,
  sourceEmitToken,
  routingById,
  boardConfigs,
}: {
  sourceBoardId: BoardId | null;
  sourceEmitToken: DragRouteToken | null;
  routingById: Record<BoardId, BoardRoutingMeta>;
  boardConfigs: Record<BoardId, BoardConfig>;
}): Record<BoardId, boolean> {
  if (sourceBoardId !== "source" || !sourceEmitToken) {
    return emptyAffordanceState();
  }
  const next = emptyAffordanceState();
  (Object.keys(boardConfigs) as BoardId[]).forEach((boardId) => {
    if (!boardConfigs[boardId].allowDropTarget) return;
    if (routingById[boardId].acceptTokens.includes(sourceEmitToken)) {
      next[boardId] = true;
    }
  });
  return next;
}

export function findGroupIdBySetId(
  itemsByGroup: Record<GroupId, SetId[]>,
  setId: SetId,
): GroupId | null {
  const groupId = Object.keys(itemsByGroup).find((candidate) =>
    itemsByGroup[candidate]?.includes(setId),
  );
  return groupId ?? null;
}

export function extractGroupIdFromOperationEntity(entity: unknown): string {
  if (!entity || typeof entity !== "object") return "";
  const maybeEntity = entity as {
    group?: string;
    data?: { group?: string };
  };
  return String(maybeEntity.group ?? maybeEntity.data?.group ?? "");
}

export function resolveBoardIdFromOperationEntity(entity: unknown): BoardId | null {
  if (!entity || typeof entity !== "object") return null;
  const maybeEntity = entity as {
    board?: string;
    data?: { board?: string };
    id?: string;
  };
  const raw = String(maybeEntity.board ?? maybeEntity.data?.board ?? maybeEntity.id ?? "");
  if (!raw) return null;
  const normalized = raw.startsWith("board-")
    ? raw.slice(6)
    : raw.startsWith("board:")
      ? raw.slice(6)
      : raw;
  if (normalized === "groups" || normalized === "entries" || normalized === "source") {
    return normalized;
  }
  return null;
}

export function getBlockedBoundaries(
  groupIds: GroupId[],
  itemsByGroup: Record<GroupId, SetId[]>,
): Set<number> {
  if (groupIds.length <= 1) {
    return new Set<number>();
  }
  const blocked = new Set<number>();
  groupIds.forEach((groupId, index) => {
    if (countRenderableSets(itemsByGroup[groupId] ?? []) === 0) {
      blocked.add(index);
      blocked.add(index + 1);
    }
  });
  return blocked;
}
