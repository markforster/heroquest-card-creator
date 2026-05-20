"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListMinus, Minus, Pencil, Plus, ReplyAll, Trash2 } from "lucide-react";
import { apiClient } from "@/api/client";
import pageStyles from "@/app/page.module.css";
import CardThumbnail from "@/components/common/CardThumbnail";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckRightPanel } from "@/components/Decks/detail/context/DeckRightPanelContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import ModalShell from "@/components/common/ModalShell";
import { useI18n } from "@/i18n/I18nProvider";
import { useCardThumbnailUrl } from "@/lib/card-thumbnail-cache";
import { isPairDeleteConfirmRequiredError } from "@/lib/decks-errors";
import styles from "../DeckGroupsSection2.module.css";
import {
  BOARD_ROUTING_META_BY_ID,
  BoardInfoPill,
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
  const { t } = useI18n();
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
  let rightPanel: ReturnType<typeof useDeckRightPanel> | null = null;
  try {
    rightPanel = useDeckRightPanel();
  } catch {
    rightPanel = null;
  }
  const { registerDropHandler } = useDeckMockDnd();
  const lastHandledDragIdRef = useRef<string | null>(null);
  const [pendingFrontRemoval, setPendingFrontRemoval] = useState<{
    items: Array<{
      entryId: string;
      setId: string;
      frontFaceId: string;
      backFaceId: string;
    }>;
  } | null>(null);
  const [isPendingRemovalBusy, setIsPendingRemovalBusy] = useState(false);
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [isRecoverBusy, setIsRecoverBusy] = useState(false);
  const [selectedRecoverFrontIds, setSelectedRecoverFrontIds] = useState<Set<string>>(new Set());
  const recoverSelectAllRef = useRef<HTMLInputElement | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const countByEntryId = useMemo(
    () => new Map((entries?.entriesSorted ?? []).map((entry) => [entry.id, entry.count])),
    [entries?.entriesSorted],
  );
  const pairedNotInSetFrontIds = entries?.pairedNotInSetFrontIds ?? [];
  const recoverableFrontIds = useMemo(
    () => Array.from(new Set(pairedNotInSetFrontIds)),
    [pairedNotInSetFrontIds],
  );
  const recoverableFrontIdSet = useMemo(() => new Set(recoverableFrontIds), [recoverableFrontIds]);
  const recoverCount = recoverableFrontIds.length;
  const selectedEntryCount = selectedEntryIds.size;
  const selectedSetBackFaceId = useMemo(() => {
    if (!selection?.selectedSetId) return null;
    return selection.setById.get(selection.selectedSetId)?.backFaceId ?? null;
  }, [selection]);
  const selectedSetCardTitle = useMemo(() => {
    if (!selectedSetBackFaceId) return null;
    const raw = rightPanel?.backCards?.find((card) => card.id === selectedSetBackFaceId)?.name ?? null;
    const normalized = raw?.trim() ?? "";
    return normalized.length ? normalized : null;
  }, [rightPanel?.backCards, selectedSetBackFaceId]);
  const selectedSetBackThumbUrl = useCardThumbnailUrl(selectedSetBackFaceId, null, {
    enabled: Boolean(selectedSetBackFaceId),
    useCache: true,
  });
  const entriesBoardTitle = useMemo(() => {
    const titleText = selectedSetCardTitle || "Entries";
    if (!selectedSetBackFaceId) return titleText;
    return (
      <span className={styles.boardTitleWithThumb}>
        <CardThumbnail
          src={selectedSetBackThumbUrl}
          alt="Selected set back"
          variant="xs"
          fit="contain"
          className={styles.boardTitleThumb}
          fallback={<div className={styles.boardTitleThumbFallback} />}
        />
        <span>{titleText}</span>
      </span>
    );
  }, [selectedSetBackFaceId, selectedSetBackThumbUrl, selectedSetCardTitle]);
  const renderSetContent = useCallback<DeckSortableBoardViewModel["renderSetContent"]>(
    ({ setId, label, cardId, state }) => {
      if (setId.startsWith("ephemeral:empty-slot:group:")) {
        return <div className={styles.setContentEmptySlot} aria-hidden="true" />;
      }
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
  const toggleRecoverSelection = useCallback((frontFaceId: string, additive: boolean) => {
    setSelectedRecoverFrontIds((prev) => {
      if (!additive) return new Set([frontFaceId]);
      const next = new Set(prev);
      if (next.has(frontFaceId)) next.delete(frontFaceId);
      else next.add(frontFaceId);
      return next;
    });
  }, []);
  const clearRecoverSelection = useCallback(() => {
    setSelectedRecoverFrontIds(new Set());
  }, []);
  const closeRecoverModal = useCallback(() => {
    if (isRecoverBusy) return;
    setIsRecoverModalOpen(false);
    clearRecoverSelection();
  }, [clearRecoverSelection, isRecoverBusy]);
  const addRecoverFronts = useCallback(
    async (frontFaceIds: string[]) => {
      if (!entries || isRecoverBusy || !entries.setId || frontFaceIds.length === 0) return;
      setIsRecoverBusy(true);
      try {
        for (const frontFaceId of frontFaceIds) {
          await entries.addFront(frontFaceId, entries.setId);
        }
        await entries.refreshEntries(entries.setId);
        setIsRecoverModalOpen(false);
        clearRecoverSelection();
      } finally {
        setIsRecoverBusy(false);
      }
    },
    [clearRecoverSelection, entries, isRecoverBusy],
  );
  const selectedRecoverFrontsOrdered = useMemo(
    () => recoverableFrontIds.filter((id) => selectedRecoverFrontIds.has(id)),
    [recoverableFrontIds, selectedRecoverFrontIds],
  );
  const recoverSelectedCount = selectedRecoverFrontsOrdered.length;
  const recoverTotalCount = recoverableFrontIds.length;
  const recoverAllSelected = recoverTotalCount > 0 && recoverSelectedCount === recoverTotalCount;
  const recoverPartiallySelected = recoverSelectedCount > 0 && recoverSelectedCount < recoverTotalCount;
  const toggleRecoverSelectAll = useCallback(() => {
    setSelectedRecoverFrontIds((prev) => {
      if (recoverableFrontIds.length === 0) return prev;
      if (prev.size === 0) {
        return new Set(recoverableFrontIds);
      }
      if (prev.size < recoverableFrontIds.length) {
        const next = new Set(prev);
        recoverableFrontIds.forEach((id) => next.add(id));
        return next;
      }
      return new Set();
    });
  }, [recoverableFrontIds]);
  const buildRemovalItems = useCallback(
    (entryIdsToRemove: Iterable<string>) => {
      const ids = new Set(entryIdsToRemove);
      const items: Array<{
        entryId: string;
        setId: string;
        frontFaceId: string;
        backFaceId: string;
      }> = [];
      for (const entry of entries?.entriesSorted ?? []) {
        if (!ids.has(entry.id)) continue;
        const pair = entries?.pairsById.get(entry.pairId);
        if (!pair?.frontFaceId || !pair.backFaceId) continue;
        items.push({
          entryId: entry.id,
          setId: entry.setId,
          frontFaceId: pair.frontFaceId,
          backFaceId: pair.backFaceId,
        });
      }
      return items;
    },
    [entries],
  );
  const openBulkRemoval = useCallback(() => {
    const items = buildRemovalItems(selectedEntryIds);
    if (!items.length) return;
    setPendingFrontRemoval({ items });
  }, [buildRemovalItems, selectedEntryIds]);
  const selectEntry = useCallback((entryId: string, additive: boolean) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (additive) {
        if (next.has(entryId)) next.delete(entryId);
        else next.add(entryId);
      } else {
        next.clear();
        next.add(entryId);
      }
      return next;
    });
  }, []);
  const model = useDeckSortableBoardViewModel("entries", BOARD_ROUTING_META_BY_ID.entries, {
    title: entriesBoardTitle,
    renderBoardHeaderActions: () => (
      <div className={styles.boardHeaderActions}>
        <button
          type="button"
          className="btn btn-outline-light btn-sm d-inline-flex align-items-center"
          onClick={() => setIsRecoverModalOpen(true)}
          disabled={recoverCount === 0}
        >
          <ReplyAll className={`${pageStyles.icon} ${pageStyles.iconLeft}`} aria-hidden="true" />
          {`Recover Paired (${recoverCount})`}
        </button>
        <button
          type="button"
          className={`btn btn-outline-danger btn-sm ${styles.removeSelectedButton}`}
          onClick={openBulkRemoval}
          disabled={selectedEntryCount === 0}
        >
          <ListMinus size={12} aria-hidden="true" />
          {` Remove Selected (${selectedEntryCount})`}
        </button>
      </div>
    ),
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
            <Pencil size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.toolbarIconButtonDelete].join(" ")}
            aria-label="Delete entry"
            title="Delete entry"
            onPointerDown={stopPropagation}
            onClick={async (event) => {
              stopPropagation(event);
              const items = buildRemovalItems([entryId]);
              if (!items.length) return;
              setPendingFrontRemoval({ items });
            }}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </>
      );
    },
    renderBottomToolbar: ({ setId, isDragging, isGhost }) => {
      if (!setId.startsWith("entry:") || isDragging || isGhost) return null;
      const entryId = setId.slice(6);
      const count = countByEntryId.get(entryId) ?? 1;
      return (
        <div className={styles.boardQuantityWrap}>
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.boardQtyAdjustButton, styles.boardQtyMinus].join(" ")}
            aria-label="Decrease quantity"
            title="Decrease quantity"
            disabled={count <= 1}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void entries?.updateEntryCount(entryId, count - 1, entries?.setId);
            }}
          >
            <Minus size={12} aria-hidden="true" />
          </button>
          <BoardInfoPill
            label={count}
            bgColor="var(--hq-black)"
            borderColor="var(--hq-black)"
          />
          <button
            type="button"
            className={[styles.toolbarIconButton, styles.boardQtyAdjustButton, styles.boardQtyPlus].join(" ")}
            aria-label="Increase quantity"
            title="Increase quantity"
            disabled={count >= 12}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void entries?.updateEntryCount(entryId, count + 1, entries?.setId);
            }}
          >
            <Plus size={12} aria-hidden="true" />
          </button>
        </div>
      );
    },
    isSetSelected: (setUiId) => {
      const entryId = setUiId.startsWith("entry:") ? setUiId.slice(6) : setUiId;
      return selectedEntryIds.has(entryId);
    },
    onSetClick: (setUiId, _groupId, options) => {
      const entryId = setUiId.startsWith("entry:") ? setUiId.slice(6) : setUiId;
      selectEntry(entryId, Boolean(options?.additive));
    },
    emptyMessage: null,
  });

  const removePending = useCallback(
    async (withUnpair: boolean) => {
      const pending = pendingFrontRemoval;
      if (!pending || isPendingRemovalBusy) return;
      setIsPendingRemovalBusy(true);
      try {
        if (withUnpair) {
          for (const item of pending.items) {
            try {
              await apiClient.deletePair({
                frontFaceId: item.frontFaceId,
                backFaceId: item.backFaceId,
                mode: "confirmable-cascade",
                confirmCascade: false,
              });
            } catch (error) {
              if (isPairDeleteConfirmRequiredError(error)) {
                await apiClient.deletePair({
                  frontFaceId: item.frontFaceId,
                  backFaceId: item.backFaceId,
                  mode: "confirmable-cascade",
                  confirmCascade: true,
                });
                continue;
              }
              throw error;
            }
          }
          await entries?.refreshEntries(entries?.setId);
        } else {
          for (const item of pending.items) {
            await entries?.removeEntry(item.entryId, item.setId);
          }
          await entries?.refreshEntries(entries?.setId);
        }
      } finally {
        setSelectedEntryIds((prev) => {
          if (prev.size === 0) return prev;
          const deletedIds = new Set(pending.items.map((item) => item.entryId));
          const next = new Set(Array.from(prev).filter((id) => !deletedIds.has(id)));
          return next.size === prev.size ? prev : next;
        });
        setPendingFrontRemoval(null);
        setIsPendingRemovalBusy(false);
      }
    },
    [entries, isPendingRemovalBusy, pendingFrontRemoval],
  );

  useEffect(() => {
    if (!entries) return () => undefined;
    return registerDropHandler("entries-controller", async (event) => {
      if (event.kind === "ENTRIES_REORDER") {
        if (!entries.setId) return { handled: true, success: true };
        if (lastHandledDragIdRef.current === event.dragId) return { handled: true, success: true };

        const orderedEntryIds = (event.orderedEntryIds ?? [])
          .filter((id) => id.startsWith("entry:"))
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
  useEffect(() => {
    setSelectedRecoverFrontIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(Array.from(prev).filter((id) => recoverableFrontIdSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [recoverableFrontIdSet]);
  useEffect(() => {
    if (!recoverSelectAllRef.current) return;
    recoverSelectAllRef.current.indeterminate = recoverPartiallySelected;
  }, [recoverPartiallySelected]);
  useEffect(() => {
    const liveEntryIds = new Set((entries?.entriesSorted ?? []).map((entry) => entry.id));
    setSelectedEntryIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(Array.from(prev).filter((id) => liveEntryIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [entries?.entriesSorted]);

  return (
    <>
      {!selection?.selectedSetId ? (
        <section
          className={[styles.board, layoutMode === "fill-parent" ? styles.boardFillParent : ""]
            .filter(Boolean)
            .join(" ")}
          data-testid="entries-empty-state-board"
        >
          <div className={styles.entriesEmptyStatePanel}>
            <div className={styles.entriesEmptyStateMessage}>Select a set to view entries.</div>
          </div>
        </section>
      ) : (
        <DeckSortableBoardView model={model} layoutMode={layoutMode} />
      )}
      <ModalShell
        isOpen={isRecoverModalOpen}
        onClose={closeRecoverModal}
        title="Recover Paired Cards"
        contentClassName={`${pageStyles.cardsPopover} ${styles.recoverCardsPopover}`}
        footer={
          <div className={styles.recoverModalToolbar}>
            <label className="d-inline-flex align-items-center gap-2 mb-0">
              <input
                ref={recoverSelectAllRef}
                type="checkbox"
                className="form-check-input hq-checkbox"
                checked={recoverAllSelected}
                disabled={isRecoverBusy || recoverTotalCount === 0}
                onChange={toggleRecoverSelectAll}
                aria-label="Select all recoverable cards"
              />
              <span>{recoverAllSelected ? "Select None" : "Select All"}</span>
            </label>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={closeRecoverModal}
              disabled={isRecoverBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void addRecoverFronts(selectedRecoverFrontsOrdered)}
              disabled={isRecoverBusy || recoverSelectedCount === 0}
            >
              {isRecoverBusy ? "Recovering..." : "Recover Selected"}
            </button>
          </div>
        }
      >
        <div className={styles.recoverModalBody}>
          {recoverableFrontIds.length === 0 ? (
            <div className={styles.recoverModalEmpty}>No paired cards to recover.</div>
          ) : (
            <div className={styles.recoverModalScrollArea}>
              <div className={styles.recoverModalGrid}>
              {recoverableFrontIds.map((frontFaceId) => {
                const isSelected = selectedRecoverFrontIds.has(frontFaceId);
                return (
                  <div key={frontFaceId} className={styles.recoverCardShell}>
                    <input
                      type="checkbox"
                      className={styles.recoverCardCheckbox}
                      aria-label={`Select ${frontFaceId}`}
                      checked={isSelected}
                      onChange={() => {
                        toggleRecoverSelection(frontFaceId, true);
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <button
                      type="button"
                      className={[
                        styles.recoverCardButton,
                        isSelected ? styles.recoverCardButtonSelected : "",
                      ].join(" ")}
                      onClick={(event) => {
                        const additive = event.metaKey || event.ctrlKey;
                        toggleRecoverSelection(frontFaceId, additive);
                      }}
                    >
                      <DefaultSetThumbnailContent
                        setId={`recover:${frontFaceId}`}
                        cardId={frontFaceId}
                        label={frontFaceId}
                        state="idle"
                      />
                    </button>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </ModalShell>
      <ConfirmModal
        isOpen={Boolean(pendingFrontRemoval)}
        title={
          pendingFrontRemoval && pendingFrontRemoval.items.length > 1
            ? `Remove ${pendingFrontRemoval.items.length} entries from set?`
            : t("decks.removeFrontPromptTitle")
        }
        confirmLabel={t("decks.removeFromSet")}
        extraLabel={t("decks.removeAndUnpair")}
        extraButtonClassName="btn btn-outline-danger btn-sm"
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          await removePending(false);
        }}
        onExtra={async () => {
          await removePending(true);
        }}
        onCancel={() => {
          if (isPendingRemovalBusy) return;
          setPendingFrontRemoval(null);
        }}
      >
        {pendingFrontRemoval && pendingFrontRemoval.items.length > 1
          ? `This will apply to ${pendingFrontRemoval.items.length} selected entries.`
          : t("decks.removeFrontPromptBody")}
      </ConfirmModal>
    </>
  );
}
