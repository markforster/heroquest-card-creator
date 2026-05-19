"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import DeckEntryQuantityControl from "@/components/Decks/detail/DeckEntryQuantityControl";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import styles from "../DeckGroupsSection2.module.css";
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
  onOpenCardEditor,
}: {
  layoutMode?: LayoutMode;
  onOpenCardEditor: (cardId: string) => void;
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
  const countByEntryId = useMemo(
    () => new Map((entries?.entriesSorted ?? []).map((entry) => [entry.id, entry.count])),
    [entries?.entriesSorted],
  );
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, cardId, state }) => {
      const rawEntryId = setId.startsWith("entry:") ? setId.slice(6) : null;
      const resolvedCardId = rawEntryId ? entries?.entryFrontIdByEntryId.get(rawEntryId) : cardId;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={resolvedCardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [entries],
  );
  const model = useDeckSortableBoardViewModel("entries", BOARD_ROUTING_META_BY_ID.entries, {
    renderSetContent,
    renderTopToolbar: ({ setId, cardId, isDragging, isGhost }) => {
      if (!setId.startsWith("entry:") || isDragging || isGhost) return null;
      const entryId = setId.slice(6);
      const stopPropagation = (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
      };
      return (
        <>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonEdit].join(" ")}
            aria-label="Edit card"
            title="Edit card"
            onPointerDown={stopPropagation}
            onClick={(event) => {
              stopPropagation(event);
              if (!cardId) return;
              onOpenCardEditor(cardId);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonDelete].join(" ")}
            aria-label="Delete entry"
            title="Delete entry"
            onPointerDown={stopPropagation}
            onClick={async (event) => {
              stopPropagation(event);
              if (!entries?.setId) return;
              await entries.removeEntry(entryId, entries.setId);
            }}
          >
            🗑
          </button>
        </>
      );
    },
    renderBottomToolbar: ({ setId, isDragging, isGhost }) => {
      if (!setId.startsWith("entry:") || isDragging || isGhost) return null;
      const entryId = setId.slice(6);
      const count = countByEntryId.get(entryId) ?? 1;
      return (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <DeckEntryQuantityControl
            count={count}
            onDecrement={() => void entries?.updateEntryCount(entryId, count - 1, entries?.setId)}
            onIncrement={() => void entries?.updateEntryCount(entryId, count + 1, entries?.setId)}
          />
        </div>
      );
    },
    isSetSelected: (setUiId) => {
      if (!selection?.selectedEntryId) return false;
      return setUiId === `entry:${selection.selectedEntryId}`;
    },
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
