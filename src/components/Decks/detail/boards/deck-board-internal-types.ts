"use client";

import type { BoardId, GroupId, SetId } from "@/components/Decks/detail/boards/deck-board-types";

import type { ReactNode } from "react";

export type DragRouteToken = string;
export type SourceItemFace = "front" | "back";

export type BoardConfig = {
  boardId: BoardId;
  title: ReactNode;
  allowMultipleGroups: boolean;
  allowGroupCreate: boolean;
  allowInGroupSort: boolean;
  allowDropTarget: boolean;
};

export type UiContainer = {
  id: GroupId;
  boardId: BoardId;
  role: "group" | "entries-lane" | "source-lane";
  allowSortWithin: boolean;
  accepts: DragRouteToken[];
};

export type UiItem = {
  uiItemId: SetId;
  kind: "set" | "entry" | "source-template";
  ephemeralKind?: "source" | "empty-slot";
  face: SourceItemFace | null;
  sourceCardId: string | null;
  persistedId: string | null;
  isEphemeral: boolean;
};

export type DnDState = {
  groupOrderByBoard: Record<BoardId, GroupId[]>;
  itemsByGroup: Record<GroupId, SetId[]>;
  groupToBoard: Record<GroupId, BoardId>;
  containerOrderByBoard: Record<BoardId, GroupId[]>;
  itemsByContainer: Record<GroupId, SetId[]>;
  containersById: Record<GroupId, UiContainer>;
  itemsById: Record<SetId, UiItem>;
};

export type BoardModel = {
  boardId: BoardId;
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  sourceItemFaceBySetId?: Record<SetId, SourceItemFace>;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
};

export type BoardRoutingMeta = {
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
};
