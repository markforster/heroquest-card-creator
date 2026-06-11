"use client";

import { useDroppable } from "@dnd-kit/react";

import type { BoardDropSurfaceProps } from "@/components/Decks/detail/boards/DeckSortableBoardView/types";

export function BoardDropSurface({
  boardId,
  canReceiveDrops,
  className,
  children,
  testId,
  onPointerMove,
  onMouseMove,
  onMouseLeave,
}: BoardDropSurfaceProps) {
  const { ref } = useDroppable({
    id: `board:${boardId}`,
    type: "board",
    accept: canReceiveDrops ? ["set"] : [],
  });

  return (
    <div
      ref={ref}
      className={className}
      data-testid={testId}
      onPointerMove={onPointerMove}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
