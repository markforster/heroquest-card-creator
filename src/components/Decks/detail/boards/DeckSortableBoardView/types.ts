"use client";

import type {
  BoardConfig,
  DragRouteToken,
} from "@/components/Decks/detail/boards/deck-board-internal-types";
import type {
  BoardId,
  GroupId,
  GroupVisualContext,
  RenderSetContent,
  SetHoverContext,
  SetId,
  SetRenderState,
  SetShellVisualContext,
  SetToolbarContext,
} from "@/components/Decks/detail/boards/deck-board-types";

import type {
  CSSProperties,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";

export type LayoutMode = "content" | "fill-parent";

export type DeckSortableBoardViewModel = {
  config: BoardConfig;
  emitToken: DragRouteToken;
  acceptTokens: DragRouteToken[];
  groupIds: GroupId[];
  itemsByGroup: Record<GroupId, SetId[]>;
  groupLabelsById: Record<GroupId, string>;
  setLabelsById: Record<SetId, string>;
  setCardIdById: Record<SetId, string>;
  activeSetId: SetId | null;
  activeGroupId: GroupId | null;
  activeTargetBoardId: BoardId | null;
  showDropAffordance: boolean;
  hoverBoundaryIndex: number | null;
  onHoverBoundary: (clientX: number) => void;
  onLeaveBoard: () => void;
  onBoundaryHoverChange: (index: number, isHovered: boolean) => void;
  onCreateGroupAtIndex: (index: number) => void;
  registerGroupRef: (groupId: GroupId, node: HTMLElement | null) => void;
  allowGroupReorder?: boolean;
  onSetClick?: (setUiId: SetId, groupUiId: GroupId, options?: { additive: boolean }) => void;
  onSetHoverChange?: (args: SetHoverContext) => void;
  renderSetContent: RenderSetContent;
  renderTopToolbar?: (args: SetToolbarContext) => ReactNode;
  renderBottomToolbar?: (args: SetToolbarContext) => ReactNode;
  isSetSelected?: (setId: SetId, groupId: GroupId) => boolean;
  resolveGroupClassName?: (args: GroupVisualContext) => string | null;
  resolveGroupStyle?: (args: GroupVisualContext) => CSSProperties | undefined;
  resolveGroupBodyClassName?: (args: GroupVisualContext) => string | null;
  resolveGroupBodyStyle?: (args: GroupVisualContext) => CSSProperties | undefined;
  resolveSetShellClassName?: (args: SetShellVisualContext) => string | null;
  resolveSetShellStyle?: (args: SetShellVisualContext) => CSSProperties | undefined;
  renderGroupOverlay?: (args: GroupVisualContext & { setIds: SetId[] }) => ReactNode;
  renderBoardHeaderActions?: () => ReactNode;
  emptyMessage?: string | null;
};

export type BoardDropSurfaceProps = {
  boardId: BoardId;
  canReceiveDrops: boolean;
  className: string;
  children: ReactNode;
  testId: string;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
};

export type GroupColumnProps = {
  boardId: BoardId;
  index: number;
  groupId: GroupId;
  label?: string;
  children: ReactNode;
  fillParent: boolean;
  canReceiveDrops: boolean;
  showHeader: boolean;
  sourceLayout?: boolean;
  entriesLayout?: boolean;
  className?: string;
  style?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
  onHoverChange?: (isHovered: boolean) => void;
  allowGroupReorder?: boolean;
  isGroupDragSource?: boolean;
};

export type DefaultSetThumbnailContentProps = {
  setId: SetId;
  cardId?: string;
  label?: string;
  state: SetRenderState;
};

export type CreateBoundaryPlaceholderProps = {
  index: number;
  onCreate: (index: number) => void;
  onHoverChange: (index: number, isHovered: boolean) => void;
  visible: boolean;
};

export type DeckSortableBoardViewProps = {
  model: DeckSortableBoardViewModel;
  layoutMode?: LayoutMode;
};
