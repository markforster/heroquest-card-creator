"use client";

import { useCallback, useEffect } from "react";
import { Gem, Trash2 } from "lucide-react";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckMutations } from "@/components/Decks/hooks/useDeckMutations";
import { useI18n } from "@/i18n/I18nProvider";
import styles from "../DeckGroupsSection2.module.css";
import {
  BOARD_ROUTING_META_BY_ID,
  BoardInfoPill,
  DefaultSetThumbnailContent,
  DeckSortableBoardView,
  type DeckSortableBoardViewModel,
  useDeckMockDnd,
  useDeckSortableBoardViewModel,
} from "./DeckBoardsCore";

export default function DeckGroupsBoardController({
  deckId,
  keySetId,
}: {
  deckId: string | null;
  keySetId: string | null;
}) {
  const mutations = useDeckMutations();
  const { t } = useI18n();
  let selection: ReturnType<typeof useDeckDetailSelection> | null = null;
  try {
    selection = useDeckDetailSelection();
  } catch {
    selection = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, cardId, state }) => {
      const rawSetId = setId.startsWith("set:") ? setId.slice(4) : null;
      const resolvedCardId = rawSetId ? selection?.setById.get(rawSetId)?.backFaceId : cardId;
      return (
        <DefaultSetThumbnailContent
          setId={setId}
          cardId={resolvedCardId ?? undefined}
          label={label}
          state={state}
        />
      );
    },
    [selection],
  );
  const model = useDeckSortableBoardViewModel("groups", BOARD_ROUTING_META_BY_ID.groups, {
    renderSetContent,
    renderTopToolbar: ({ setId, isDragging, isGhost }) => {
      if (!setId.startsWith("set:") || isDragging || isGhost) return null;
      const resolvedSetId = setId.slice(4);
      const stopPropagation = (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
      };
      return (
        <>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonKey].join(" ")}
            aria-label="Set key card"
            title="Set key card"
            onPointerDown={stopPropagation}
            onClick={async (event) => {
              stopPropagation(event);
              if (!deckId) return;
              await mutations.setDeckKeySet(deckId, resolvedSetId);
              await selection?.reloadStructure(selection.selectedSetId);
            }}
          >
            <Gem size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonDelete].join(" ")}
            aria-label="Delete set"
            title="Delete set"
            onPointerDown={stopPropagation}
            onClick={async (event) => {
              stopPropagation(event);
              const wasSelected = selection?.selectedSetId === resolvedSetId;
              await mutations.deleteSet(resolvedSetId);
              await selection?.reloadStructure(selection?.selectedSetId);
              if (wasSelected) {
                selection?.clearSelection();
              }
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </>
      );
    },
    renderBottomToolbar: ({ setId, isDragging, isGhost }) => {
      if (isDragging || isGhost) return null;
      if (!setId.startsWith("set:")) return null;
      const resolvedSetId = setId.slice(4);
      const isKeySet = keySetId === resolvedSetId;
      if (!isKeySet) return null;
      return (
        <BoardInfoPill
          icon={<Gem size={11} aria-hidden="true" />}
          label="Key Card"
          bgColor="color-mix(in srgb, #2a73ff 35%, var(--hq-surface-900) 65%)"
          borderColor="color-mix(in srgb, #2a73ff 55%, var(--hq-border-strong) 45%)"
        />
      );
    },
    isSetSelected: (setUiId) => {
      if (!selection?.selectedSetId) return false;
      return setUiId === `set:${selection.selectedSetId}`;
    },
    onSetClick: (setUiId, groupUiId) => {
      if (!selection) return;
      if (!setUiId.startsWith("set:")) return;
      if (!groupUiId.startsWith("group:")) return;
      const setId = setUiId.slice(4);
      const groupId = groupUiId.slice(6);
      const setRecord = selection.setById.get(setId);
      if (!setRecord) return;
      selection.selectGroup(groupId);
      selection.selectSet(setRecord);
    },
  });

  useEffect(() => {
    if (!selection) return () => undefined;
    const deleteGroupIfEmpty = async (groupId: string, isEmpty: boolean): Promise<void> => {
      if (!isEmpty || !groupId) return;
      try {
        await mutations.deleteGroup(groupId);
      } catch {
        // Non-fatal; reload will re-sync.
      }
    };
    return registerDropHandler("groups-controller", async (event) => {
      if (event.kind === "GROUPS_REORDER_SETS") {
        const isCrossGroup = event.sourceGroupId !== event.targetGroupId;
        if (isCrossGroup) {
          await mutations.updateSetGroup(event.setId, event.targetGroupId);
        }
        if (event.orderedTargetSetIds.length > 0) {
          await mutations.reorderSets(event.orderedTargetSetIds[0], event.orderedTargetSetIds);
        }
        if (isCrossGroup && event.orderedSourceSetIds.length > 0) {
          await mutations.reorderSets(event.orderedSourceSetIds[0], event.orderedSourceSetIds);
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SET_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await mutations.createGroup(deckId, t("decks.defaultGroupTitle"));
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await mutations.reorderGroups(deckId, nextGroupOrder);
        await mutations.updateSetGroup(event.setId, createdGroup.id);
        await mutations.reorderSets(event.setId, [event.setId]);
        if (event.orderedSourceSetIds.length > 0) {
          await mutations.reorderSets(event.orderedSourceSetIds[0], event.orderedSourceSetIds);
        }
        await deleteGroupIfEmpty(event.sourceGroupId, event.sourceGroupEmptyAfterDrop);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const created = await mutations.createSetFromBackFace(
          deckId,
          event.targetGroupId,
          event.backFaceId,
          t("decks.defaultSetTitle"),
        );
        const orderedTargetSetIds = selection.sets
          .filter((set) => set.groupId === event.targetGroupId)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((set) => set.id);
        const clampedIndex = Math.max(0, Math.min(event.targetIndex, orderedTargetSetIds.length));
        const nextOrdered = orderedTargetSetIds.slice();
        nextOrdered.splice(clampedIndex, 0, created.id);
        await mutations.reorderSets(created.id, nextOrdered);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      if (event.kind === "GROUPS_DROP_SOURCE_CARD_TO_NEW_GROUP") {
        if (!deckId) return { handled: true, success: false, fatal: true, reason: "missing deckId" };
        const createdGroup = await mutations.createGroup(deckId, t("decks.defaultGroupTitle"));
        const orderedGroupIds = selection.orderedGroups.map((group) => group.id);
        const insertionIndex = Math.max(0, Math.min(event.targetGroupIndex, orderedGroupIds.length));
        const nextGroupOrder = orderedGroupIds.slice();
        nextGroupOrder.splice(insertionIndex, 0, createdGroup.id);
        await mutations.reorderGroups(deckId, nextGroupOrder);
        const createdSet = await mutations.createSetFromBackFace(
          deckId,
          createdGroup.id,
          event.backFaceId,
          t("decks.defaultSetTitle"),
        );
        await mutations.reorderSets(createdSet.id, [createdSet.id]);
        await selection.reloadStructure(selection.selectedSetId);
        return { handled: true, success: true };
      }

      return null;
    });
  }, [deckId, mutations, registerDropHandler, selection, t]);

  return <DeckSortableBoardView model={model} layoutMode="content" />;
}
