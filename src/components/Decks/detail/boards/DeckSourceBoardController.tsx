"use client";

import { useCallback, useEffect } from "react";
import {
  BOARD_ROUTING_META_BY_ID,
  DefaultSetThumbnailContent,
  DeckSortableBoardView,
  type DeckSortableBoardViewModel,
  type LayoutMode,
  useDeckMockDnd,
  useDeckSortableBoardViewModel,
} from "./DeckBoardsCore";

export default function DeckSourceBoardController({ layoutMode = "fill-parent" }: { layoutMode?: LayoutMode }) {
  const { registerDropHandler } = useDeckMockDnd();
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, state }) => {
      const cardId = setId.startsWith("source:") ? setId.slice(7) : null;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={cardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [],
  );
  const model = useDeckSortableBoardViewModel("source", BOARD_ROUTING_META_BY_ID.source, {
    renderSetContent,
  });
  useEffect(() => registerDropHandler("source-controller", async () => null), [registerDropHandler]);
  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}
