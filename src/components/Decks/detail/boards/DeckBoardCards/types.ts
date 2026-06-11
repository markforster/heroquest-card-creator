"use client";

import type {
  BoardId,
  GroupId,
  RenderSetContent,
  RenderSetToolbar,
  SetId,
} from "@/components/Decks/detail/boards/deck-board-types";

import type { CSSProperties, MouseEvent } from "react";

export type SharedSetCardProps = {
  boardId: BoardId;
  setId: SetId;
  label?: string;
  groupId: GroupId;
  cardId?: string;
  renderContent: RenderSetContent;
  isSelected: boolean;
  isEphemeral?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onHoverChange?: (isHovered: boolean) => void;
  renderTopToolbar?: RenderSetToolbar;
  renderBottomToolbar?: RenderSetToolbar;
  sourceLayout?: boolean;
  shellClassName?: string;
  shellStyle?: CSSProperties;
};

export type SortableSetCardProps = SharedSetCardProps & {
  index: number;
};

export type EmptySlotDropCardProps = {
  setId: SetId;
  groupId: GroupId;
  sourceLayout?: boolean;
  shellClassName?: string;
  shellStyle?: CSSProperties;
  renderContent: RenderSetContent;
};

export type OverlayCardProps = {
  setId: SetId;
  groupId: GroupId;
  label?: string;
  cardId?: string;
  renderContent: RenderSetContent;
};
