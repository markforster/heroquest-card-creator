"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import {
  BOARD_ROUTING_META_BY_ID,
  DefaultSetThumbnailContent,
  DeckSortableBoardView,
  type DeckSortableBoardViewModel,
  type LayoutMode,
  useDeckMockDnd,
  useDeckSortableBoardViewModel,
} from "./DeckBoardsCore";

export default function DeckEntriesBoardController({
  layoutMode = "fill-parent",
}: {
  layoutMode?: LayoutMode;
}) {
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  let entries: ReturnType<typeof useDeckSetEntries> | null = null;
  try {
    entries = useDeckSetEntries();
  } catch {
    entries = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const lastHandledDragIdRef = useRef<string | null>(null);
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, state }) => {
      const rawEntryId = setId.startsWith("entry:") ? setId.slice(6) : null;
      const cardId = rawEntryId ? entries?.entryFrontIdByEntryId.get(rawEntryId) : null;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={cardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [entries],
  );
  const model = useDeckSortableBoardViewModel("entries", BOARD_ROUTING_META_BY_ID.entries, {
    renderSetContent,
    emptyMessage: selection?.selectedSetId ? null : "Select a set to view entries.",
  });

  useEffect(() => {
    if (!entries) return () => undefined;
    return registerDropHandler("entries-controller", async (event) => {
      if (event.kind === "ENTRIES_REORDER") {
        if (!entries.setId) return { handled: true, success: true };
        if (lastHandledDragIdRef.current === event.dragId) return { handled: true, success: true };

        const orderedEntryIds = (event.orderedEntryIds ?? [])
          .map((id) => id.replace(/^entry:/, ""))
          .filter(Boolean);
        if (orderedEntryIds.length === 0) return { handled: true, success: true };

        try {
          if (typeof entries.reorderEntriesOptimistic === "function") {
            await entries.reorderEntriesOptimistic(orderedEntryIds);
          } else {
            await entries.reorderEntries(orderedEntryIds);
          }
          lastHandledDragIdRef.current = event.dragId;
          return { handled: true, success: true };
        } catch (error) {
          return {
            handled: true,
            success: false,
            fatal: true,
            reason: error instanceof Error ? error.message : "entries reorder failed",
          };
        }
      }

      if (event.kind === "ENTRIES_DROP_SOURCE_TO_ENTRIES") {
        if (!entries.setId) return { handled: true, success: true };
        if (lastHandledDragIdRef.current === event.dragId) return { handled: true, success: true };

        try {
          const frontFaceId = event.frontFaceId;
          if (!frontFaceId) return { handled: true, success: true };

          const prevEntries = entries.entriesSorted.slice().sort((a, b) => a.sortIndex - b.sortIndex);
          const createdEntries = await entries.addFront(frontFaceId);
          if (!createdEntries.length) {
            lastHandledDragIdRef.current = event.dragId;
            return { handled: true, success: true };
          }

          const newEntryId = createdEntries[0]?.id ?? null;
          if (!newEntryId) {
            lastHandledDragIdRef.current = event.dragId;
            return { handled: true, success: true };
          }

          const ordered = prevEntries.map((entryItem) => entryItem.id).filter((id) => id !== newEntryId);
          const dropIndex = Math.max(0, Math.min(event.targetIndex, ordered.length));
          ordered.splice(dropIndex, 0, newEntryId);

          if (typeof entries.reorderEntriesOptimistic === "function") {
            await entries.reorderEntriesOptimistic(ordered);
          } else {
            await entries.reorderEntries(ordered);
          }

          lastHandledDragIdRef.current = event.dragId;
          return { handled: true, success: true };
        } catch (error) {
          return {
            handled: true,
            success: false,
            fatal: true,
            reason: error instanceof Error ? error.message : "entries add/reorder failed",
          };
        }
      }
      return null;
    });
  }, [entries, registerDropHandler]);

  return <DeckSortableBoardView model={model} layoutMode={layoutMode} />;
}
