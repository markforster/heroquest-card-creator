"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import styles from "@/app/page.module.css";
import ConfirmModal from "@/components/Modals/ConfirmModal";
import DeckEntryQuantityControl from "@/components/Decks/detail/DeckEntryQuantityControl";
import { buildDeckDeepLink } from "@/components/Decks/deckDeepLink";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import type { DeckDetailDragState } from "@/components/Decks/types/deck-detail";
import { useI18n } from "@/i18n/I18nProvider";
import formatMessageWith from "@/lib/format-message-with";
import { isPairDeleteConfirmRequiredError, type PairUsageReport } from "@/lib/decks-errors";

import type { ReactNode } from "react";

function DeckEntryCard({
  entryId,
  frontId,
  isSelected,
  onRequestRemove,
  count,
  onUpdateCount,
  onSelectEntry,
  onOpenCardEditor,
  deckEntryThumb,
}: {
  entryId: string;
  frontId: string;
  isSelected: boolean;
  onRequestRemove?: (entryId: string, frontId: string) => void;
  count: number;
  onUpdateCount: (entryId: string, nextCount: number) => Promise<void>;
  onSelectEntry: (entryId: string, hasModifier: boolean) => void;
  onOpenCardEditor: (cardId: string) => void;
  deckEntryThumb: (cardId: string, isSelected: boolean) => ReactNode;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: entryId,
    data: { type: "entry", entryId },
  });
  const style = {
    touchAction: "none" as const,
    transform: CSS.Transform.toString(transform),
    transition: undefined,
    opacity: isDragging ? 0 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      data-entry-id={entryId}
      className={styles.deckEntryCard}
      style={style}
    >
      <div className={styles.deckEntryCardOverlayAnchor}>
        <button
          type="button"
          className={`${styles.deckEntrySelect} ${isDragging ? styles.deckEntrySelectDragging : ""}`}
          onClick={(event) => onSelectEntry(entryId, event.metaKey || event.ctrlKey)}
          onDoubleClick={() => onOpenCardEditor(frontId)}
          {...attributes}
          {...listeners}
        >
          {deckEntryThumb(frontId, isSelected)}
        </button>
        {onRequestRemove ? (
          <>
            <div className={styles.deckEntryCardActions}>
              <button
                type="button"
                className={styles.deckCardEditButton}
                aria-label={t("decks.entries.actions.editFront")}
                title={t("decks.entries.actions.editFront")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenCardEditor(frontId);
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className={styles.deckCardRemoveButton}
                aria-label={t("decks.entries.actions.removeFront")}
                title={t("decks.entries.actions.removeFront")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestRemove(entryId, frontId);
                }}
              >
                ×
              </button>
            </div>
            <div className={styles.deckEntryCardBottomActions}>
              <DeckEntryQuantityControl
                count={count}
                onDecrement={() => void onUpdateCount(entryId, count - 1)}
                onIncrement={() => void onUpdateCount(entryId, count + 1)}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DeckEntryDropTargetCard({
  entryId,
  frontId,
  isSelected,
  onSelectEntry,
  onOpenCardEditor,
  deckEntryThumb,
}: {
  entryId: string;
  frontId: string;
  isSelected: boolean;
  onSelectEntry: (entryId: string, hasModifier: boolean) => void;
  onOpenCardEditor: (cardId: string) => void;
  deckEntryThumb: (cardId: string, isSelected: boolean) => ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: entryId });
  return (
    <div ref={setNodeRef} data-entry-id={entryId} className={styles.deckEntryCard}>
      <button
        type="button"
        className={styles.deckEntrySelect}
        onClick={(event) => onSelectEntry(entryId, event.metaKey || event.ctrlKey)}
        onDoubleClick={() => onOpenCardEditor(frontId)}
      >
        {deckEntryThumb(frontId, isSelected)}
      </button>
    </div>
  );
}

export default function DeckEntriesSection({
  drag,
  entriesRowRef,
  onOpenCardEditor,
  deckEntryThumb,
}: {
  drag: DeckDetailDragState;
  entriesRowRef: (node: HTMLDivElement | null) => void;
  onOpenCardEditor: (cardId: string) => void;
  deckEntryThumb: (cardId: string, isSelected: boolean) => ReactNode;
}) {
  const { t } = useI18n();
  const formatMessage = (key: string, vars: Record<string, string | number>) =>
    formatMessageWith(t as never, key as never, vars);
  const navigate = useNavigate();
  const {
    deckId,
    orderedGroups,
    sets,
    selectedGroupId,
    selectedSetId,
    selectedEntryId,
    setSelectedEntryId,
  } = useDeckDetailSelection();
  const {
    entriesSorted,
    pairsById,
    pairedNotInSetFrontIds,
    addFront,
    removeEntry,
    updateEntryCount,
    refreshEntries,
  } =
    useDeckSetEntries();
  const { setNodeRef: setEntriesDropRef } = useDroppable({ id: "entries-area" });
  const { setNodeRef: setTailDropRef } = useDroppable({ id: "entries-tail" });
  const setEntriesPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      setEntriesDropRef(node);
      entriesRowRef(node);
    },
    [entriesRowRef, setEntriesDropRef],
  );
  const visibleEntries = useMemo(
    () =>
      drag.finalizingEntryId
        ? entriesSorted.filter((entry) => entry.id !== drag.finalizingEntryId)
        : entriesSorted,
    [drag.finalizingEntryId, entriesSorted],
  );
  const entryIds = useMemo(() => entriesSorted.map((entry) => entry.id), [entriesSorted]);

  const [entriesViewMode, setEntriesViewMode] = useState<"in-set" | "paired-not-in-set">("in-set");
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [pendingFrontRemoval, setPendingFrontRemoval] = useState<{
    items: Array<{
      entryId: string;
      setId: string;
      frontFaceId: string;
      backFaceId: string;
    }>;
  } | null>(null);
  const [isPendingRemovalBusy, setIsPendingRemovalBusy] = useState(false);
  const [pairUsagePrompt, setPairUsagePrompt] = useState<PairUsageReport | null>(null);
  const pairUsagePromptExternal = useMemo(() => {
    if (!pairUsagePrompt) return null;
    return {
      ...pairUsagePrompt,
      cascadePlan: {
        ...pairUsagePrompt.cascadePlan,
        usage: pairUsagePrompt.cascadePlan.usage.filter((usage) => usage.deckId !== deckId),
      },
    };
  }, [deckId, pairUsagePrompt]);
  useEffect(() => {
    setEntriesViewMode("in-set");
    setSelectedEntryIds(new Set());
    setSelectedEntryId(null);
    setPendingFrontRemoval(null);
    setIsPendingRemovalBusy(false);
  }, [selectedSetId, setSelectedEntryId]);

  useEffect(() => {
    if (!selectedEntryId) return;
    const exists = entriesSorted.some((entry) => entry.id === selectedEntryId);
    if (!exists) {
      setSelectedEntryId(null);
    }
  }, [entriesSorted, selectedEntryId, setSelectedEntryId]);

  const buildRemovalItems = useCallback(
    (entryIdsToRemove: Iterable<string>) => {
      const ids = new Set(entryIdsToRemove);
      const items: Array<{
        entryId: string;
        setId: string;
        frontFaceId: string;
        backFaceId: string;
      }> = [];
      for (const entry of entriesSorted) {
        if (!ids.has(entry.id)) continue;
        const pair = pairsById.get(entry.pairId);
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
    [entriesSorted, pairsById],
  );

  const openBulkRemoval = useCallback(() => {
    const items = buildRemovalItems(selectedEntryIds);
    if (items.length === 0) return;
    setPendingFrontRemoval({ items });
  }, [buildRemovalItems, selectedEntryIds]);

  const openSingleRemoval = useCallback(
    (entryId: string) => {
      const items = buildRemovalItems([entryId]);
      if (items.length === 0) return;
      setPendingFrontRemoval({ items });
    },
    [buildRemovalItems],
  );

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
                const externalUsage = error.report.cascadePlan.usage.filter(
                  (usage) => usage.deckId !== deckId,
                );
                if (externalUsage.length === 0) {
                  await apiClient.deletePair({
                    frontFaceId: item.frontFaceId,
                    backFaceId: item.backFaceId,
                    mode: "confirmable-cascade",
                    confirmCascade: true,
                  });
                  continue;
                }
                setPairUsagePrompt({
                  ...error.report,
                  cascadePlan: {
                    ...error.report.cascadePlan,
                    usage: externalUsage,
                  },
                });
                return;
              }
              throw error;
            }
          }
          await refreshEntries(selectedSetId);
        } else {
          for (const item of pending.items) {
            await removeEntry(item.entryId, item.setId);
          }
          await refreshEntries(selectedSetId);
        }
        const removedIds = new Set(pending.items.map((item) => item.entryId));
        setSelectedEntryIds((prev) => {
          if (removedIds.size === 0 || prev.size === 0) return prev;
          const next = new Set(prev);
          let changed = false;
          for (const entryId of removedIds) {
            if (next.delete(entryId)) changed = true;
          }
          return changed ? next : prev;
        });
        if (
          pending.items.some((item) => item.entryId === selectedEntryId)
        ) {
          setSelectedEntryId(null);
        }
        setPendingFrontRemoval(null);
      } finally {
        setIsPendingRemovalBusy(false);
      }
    },
    [
      isPendingRemovalBusy,
      pendingFrontRemoval,
      refreshEntries,
      removeEntry,
      selectedEntryId,
      selectedSetId,
      setSelectedEntryId,
    ],
  );

  const removeFromSetOnly = useCallback(async () => {
    await removePending(false);
  }, [removePending]);

  const removeAndUnpair = useCallback(async () => {
    await removePending(true);
  }, [removePending]);

  const canBulkDelete = entriesViewMode === "in-set" && selectedEntryIds.size > 0;

  const requestRemoveForEntry = useCallback(
    (entryId: string) => {
      if (!selectedSetId) return;
      openSingleRemoval(entryId);
    },
    [openSingleRemoval, selectedSetId],
  );

  const selectEntry = (entryId: string, hasModifier: boolean) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (hasModifier) {
        if (next.has(entryId)) next.delete(entryId);
        else next.add(entryId);
      } else if (next.size === 1 && next.has(entryId)) {
        next.clear();
      } else {
        next.clear();
        next.add(entryId);
      }
      if (next.size === 0) {
        setSelectedEntryId(null);
      } else if (next.has(entryId)) {
        setSelectedEntryId(entryId);
      } else if (selectedEntryId && next.has(selectedEntryId)) {
        setSelectedEntryId(selectedEntryId);
      } else {
        const [first] = Array.from(next.values());
        setSelectedEntryId(first ?? null);
      }
      return next;
    });
  };

  const renderEntryPlaceholder = (key: string) => (
    <div key={key} className={styles.deckEntryCard} aria-hidden="true">
      <div
        data-entry-placeholder="true"
        className={`${styles.deckEntriesDropPlaceholder} ${
          drag.isFrontDropOver || drag.isEntriesDropOver ? styles.deckEntriesDropPlaceholderOver : ""
        }`}
      />
    </div>
  );

  if (orderedGroups.length === 0 || sets.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.deckRouteRow} ${styles.deckRouteRowFill} ${styles.deckEntriesRouteRow}`}>
      {selectedSetId ? (
        <div
          className={`${styles.deckRouteRowToolbar} ${styles.assetsToolbar} d-flex align-items-center justify-content-between gap-2 px-2 py-2`}
        >
          <div className={styles.deckFacesSegment} role="tablist" aria-label={t("decks.entries.mode.label")}>
            <button
              type="button"
              className={`${styles.deckFacesSegmentBtn} ${
                entriesViewMode === "in-set" ? styles.deckFacesSegmentBtnActive : ""
              }`}
              aria-pressed={entriesViewMode === "in-set"}
              onClick={() => setEntriesViewMode("in-set")}
            >
              {formatMessage("decks.entries.mode.inSet", { count: entriesSorted.length })}
            </button>
            <button
              type="button"
              className={`${styles.deckFacesSegmentBtn} ${
                entriesViewMode === "paired-not-in-set" ? styles.deckFacesSegmentBtnActive : ""
              }`}
              aria-pressed={entriesViewMode === "paired-not-in-set"}
              onClick={() => setEntriesViewMode("paired-not-in-set")}
            >
              {formatMessage("decks.entries.mode.pairedNotInSet", {
                count: pairedNotInSetFrontIds.length,
              })}
            </button>
          </div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={openBulkRemoval}
            disabled={!canBulkDelete}
          >
            {t("decks.entries.actions.removeSelected")}
          </button>
        </div>
      ) : null}
      <div className={`${styles.deckRouteRowBody} ${styles.deckRouteRowBodyFill}`}>
        {!selectedGroupId ? (
          <div className={styles.deckEntriesEmptyFill}>
            <div className={styles.decksEmpty}>{t("decks.noGroupSelectedEntries")}</div>
          </div>
        ) : !selectedSetId ? (
          <div className={styles.deckEntriesEmptyFill}>
            <div className={styles.decksEmpty}>{t("decks.noSetSelected")}</div>
          </div>
        ) : (
          <div className={styles.deckEntriesSection}>
            <div
              ref={setEntriesPanelRef}
              data-deck-entries-dropzone="true"
              className={`${styles.deckEntriesPanel} ${
                drag.isFrontFaceDragActive || drag.isEntryDragActive ? styles.deckEntriesPanelDropActive : ""
              } ${drag.isFrontDropOver || drag.isEntriesDropOver ? styles.deckEntriesPanelDropOver : ""}`}
            >
            {entriesViewMode === "paired-not-in-set" ? (
              pairedNotInSetFrontIds.length === 0 ? (
                <div className={styles.deckEntriesEmptyFill}>
                  <div className={styles.decksEmpty}>{t("decks.entries.empty.noPairedPending")}</div>
                </div>
              ) : (
                <div className={styles.deckEntriesGrid}>
                  {pairedNotInSetFrontIds.map((frontId) => (
                    <div key={frontId} className={styles.deckEntryCard}>
                      <button
                        type="button"
                        className={styles.deckEntrySelect}
                        onClick={async () => {
                          await addFront(frontId, selectedSetId);
                        }}
                      >
                        {deckEntryThumb(frontId, false)}
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : entriesSorted.length === 0 ? (
              drag.isFrontFaceDragActive && drag.entryDropIndex === 0 ? (
                <div className={styles.deckEntriesGrid}>
                  {renderEntryPlaceholder("entry-placeholder-empty")}
                </div>
              ) : (
                <div className={styles.deckEntriesEmptyFill}>
                  <div className={`${styles.decksEmpty} ${styles.deckEntriesEmptyMessageFull}`}>
                    {t("decks.emptyEntries")}
                  </div>
                </div>
              )
            ) : drag.isFrontFaceDragActive ? (
              <div className={styles.deckEntriesGrid}>
                {visibleEntries.flatMap((entry, index) => {
                  const rendered: ReactNode[] = [];
                  if (drag.entryDropIndex != null && drag.entryDropIndex === index) {
                    rendered.push(renderEntryPlaceholder(`entry-placeholder-${index}`));
                  }
                  const pair = pairsById.get(entry.pairId);
                  const frontId = pair?.frontFaceId ?? null;
                  const isSelected = selectedEntryIds.has(entry.id);
                  if (!frontId) {
                    rendered.push(
                      <div key={entry.id} className={styles.deckEntryMissing}>
                        <div>{t("decks.missingEntry")}</div>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={async () => {
                            await removeEntry(entry.id, entry.setId);
                            setSelectedEntryIds(() => new Set());
                            if (selectedEntryId === entry.id) setSelectedEntryId(null);
                          }}
                        >
                          {t("actions.remove")}
                        </button>
                      </div>,
                    );
                    return rendered;
                  }
                  rendered.push(
                    <DeckEntryDropTargetCard
                      key={entry.id}
                      entryId={entry.id}
                      frontId={frontId}
                      isSelected={isSelected}
                      onSelectEntry={selectEntry}
                      onOpenCardEditor={onOpenCardEditor}
                      deckEntryThumb={deckEntryThumb}
                    />,
                  );
                  return rendered;
                })}
                {drag.entryDropIndex != null && drag.entryDropIndex >= visibleEntries.length
                  ? renderEntryPlaceholder("entry-placeholder-tail")
                  : null}
                <div
                  ref={setTailDropRef}
                  data-entry-tail-dropzone="true"
                  className={styles.deckEntryCard}
                  aria-hidden="true"
                  style={{ width: 1, height: 1, opacity: 0 }}
                />
              </div>
            ) : (
              <SortableContext items={entryIds} strategy={rectSortingStrategy}>
                <div className={styles.deckEntriesGrid}>
                  {visibleEntries.map((entry) => {
                    const pair = pairsById.get(entry.pairId);
                    const frontId = pair?.frontFaceId ?? null;
                    const isSelected = selectedEntryIds.has(entry.id);
                    if (!frontId) {
                      return (
                        <div key={entry.id} className={styles.deckEntryMissing}>
                          <div>{t("decks.missingEntry")}</div>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={async () => {
                              await removeEntry(entry.id, entry.setId);
                              setSelectedEntryIds(() => new Set());
                              if (selectedEntryId === entry.id) setSelectedEntryId(null);
                            }}
                          >
                            {t("actions.remove")}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <DeckEntryCard
                        key={entry.id}
                        entryId={entry.id}
                        frontId={frontId}
                        isSelected={isSelected}
                        count={entry.count}
                        onUpdateCount={updateEntryCount}
                        onRequestRemove={(entryId) => requestRemoveForEntry(entryId)}
                        onSelectEntry={selectEntry}
                        onOpenCardEditor={onOpenCardEditor}
                        deckEntryThumb={deckEntryThumb}
                      />
                    );
                  })}
                  <div
                    ref={setTailDropRef}
                    data-entry-tail-dropzone="true"
                    className={styles.deckEntryCard}
                    aria-hidden="true"
                    style={{ width: 1, height: 1, opacity: 0 }}
                  />
                </div>
              </SortableContext>
            )}
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingFrontRemoval)}
        title={t("decks.removeFrontPromptTitle")}
        confirmLabel={t("decks.removeFromSet")}
        extraLabel={t("decks.removeAndUnpair")}
        extraButtonClassName="btn btn-outline-danger btn-sm"
        cancelLabel={t("actions.cancel")}
        onConfirm={removeFromSetOnly}
        onExtra={removeAndUnpair}
        onCancel={() => {
          if (isPendingRemovalBusy) return;
          setPendingFrontRemoval(null);
        }}
      >
        {t("decks.removeFrontPromptBody")}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(pairUsagePromptExternal?.cascadePlan.usage.length)}
        title={t("decks.pairInUseTitle")}
        confirmLabel={t("actions.confirm")}
        extraLabel={t("decks.openDeck")}
        cancelLabel={t("actions.cancel")}
        onConfirm={async () => {
          const pending = pairUsagePrompt;
          const pendingRemoval = pendingFrontRemoval;
          setPairUsagePrompt(null);
          if (!pending || !pendingRemoval) return;
          const seen = new Set<string>();
          for (const item of pendingRemoval.items) {
            const key = `${item.frontFaceId}|${item.backFaceId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            await apiClient.deletePair({
              frontFaceId: item.frontFaceId,
              backFaceId: item.backFaceId,
              mode: "confirmable-cascade",
              confirmCascade: true,
            });
          }
          await refreshEntries(selectedSetId);
          setPendingFrontRemoval(null);
        }}
        onExtra={() => {
          const usage = pairUsagePromptExternal?.cascadePlan.usage[0];
          if (usage) {
            navigate(buildDeckDeepLink({ deckId: usage.deckId, setId: usage.setId }));
          }
          setPairUsagePrompt(null);
        }}
        onCancel={() => setPairUsagePrompt(null)}
      >
        <div className={styles.pairingUsageList}>
          <div>
            {t("decks.pairUsage.body")}
          </div>
          <ul className={styles.pairingUsageItems}>
            {(pairUsagePromptExternal?.cascadePlan.usage ?? []).map((usage) => (
              <li key={`${usage.deckId}-${usage.groupId}-${usage.setId}`}>
                {`${usage.deckTitle} › ${usage.groupTitle} › ${usage.setTitle}`}
              </li>
            ))}
          </ul>
        </div>
      </ConfirmModal>
    </div>
  );
}
