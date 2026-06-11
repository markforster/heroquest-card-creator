"use client";

import type { CSSProperties, ReactNode } from "react";

export type BoardId = "groups" | "entries" | "source";
export type GroupId = string;
export type SetId = string;
export type SetRenderState =
  | "idle"
  | "dragging"
  | "ghost"
  | "dropTarget"
  | "pending"
  | "overlay";

export type SetToolbarContext = {
  boardId: BoardId;
  setId: SetId;
  groupId: GroupId;
  cardId?: string;
  isSelected: boolean;
  isDragging: boolean;
  isGhost: boolean;
  isDropTarget: boolean;
};

export type GroupVisualContext = {
  boardId: BoardId;
  groupId: GroupId;
  isHovered: boolean;
  hasSelectedSet: boolean;
  setCount: number;
};

export type SetHoverContext = {
  boardId: BoardId;
  groupId: GroupId;
  setId: SetId;
  isHovered: boolean;
};

export type SetRenderContentArgs = {
  setId: SetId;
  groupId: GroupId;
  label?: string;
  cardId?: string;
  state: SetRenderState;
};

export type RenderSetContent = (args: SetRenderContentArgs) => ReactNode;
export type RenderSetToolbar = (args: SetToolbarContext) => ReactNode;
export type SetShellVisualContext = GroupVisualContext & {
  setId: SetId;
  setIndex: number;
};

export type ResolveSetShellClassName = (args: SetShellVisualContext) => string | null;
export type ResolveSetShellStyle = (args: SetShellVisualContext) => CSSProperties | undefined;
