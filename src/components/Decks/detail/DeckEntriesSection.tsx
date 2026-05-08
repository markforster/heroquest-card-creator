"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import { useDeckSetEntries } from "@/components/Decks/detail/context/DeckSetEntriesContext";
import type { DeckDetailDragState } from "@/components/Decks/types/deck-detail";
import { useI18n } from "@/i18n/I18nProvider";

import type { ReactNode } from "react";

function DeckEntryCard({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entryId,
    data: { type: "entry", entryId },
  });
  const style = {
    touchAction: "none" as const,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      data-entry-id={entryId}
      className={styles.deckEntryCard}
      style={style}
    >
      <button
        type="button"
        className={styles.deckEntrySelect}
        onClick={(event) => onSelectEntry(entryId, event.metaKey || event.ctrlKey)}
        onDoubleClick={() => onOpenCardEditor(frontId)}
        {...attributes}
        {...listeners}
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
  const { selectedGroupId, selectedSetId } = useDeckDetailSelection();
  const { entriesSorted, pairsById, pairedNotInSetFrontIds, addFront, removeEntry } =
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
  const visibleEntries = entriesSorted;
  const entryIds = useMemo(() => entriesSorted.map((entry) => entry.id), [entriesSorted]);

  const [entriesViewMode, setEntriesViewMode] = useState<"in-set" | "paired-not-in-set">("in-set");
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setEntriesViewMode("in-set");
    setSelectedEntryIds(new Set());
  }, [selectedSetId]);

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

  return (
    <div className={styles.deckRouteRow}>
      <div className={styles.deckRouteRowToolbar} />
      <div className={styles.deckRouteRowBody}>
        {!selectedGroupId ? (
          <div className={styles.decksEmpty}>{t("decks.noGroupSelectedEntries")}</div>
        ) : !selectedSetId ? (
          <div className={styles.decksEmpty}>{t("decks.noSetSelected")}</div>
        ) : (
          <div
            ref={setEntriesPanelRef}
            data-deck-entries-dropzone="true"
            className={`${styles.deckEntriesPanel} ${
              drag.isFrontFaceDragActive || drag.isEntryDragActive ? styles.deckEntriesPanelDropActive : ""
            } ${drag.isFrontDropOver || drag.isEntriesDropOver ? styles.deckEntriesPanelDropOver : ""}`}
          >
            <div className={styles.deckFacesSegment} role="tablist" aria-label="Set cards mode">
              <button
                type="button"
                className={`${styles.deckFacesSegmentBtn} ${
                  entriesViewMode === "in-set" ? styles.deckFacesSegmentBtnActive : ""
                }`}
                aria-pressed={entriesViewMode === "in-set"}
                onClick={() => setEntriesViewMode("in-set")}
              >
                In Set ({entriesSorted.length})
              </button>
              <button
                type="button"
                className={`${styles.deckFacesSegmentBtn} ${
                  entriesViewMode === "paired-not-in-set" ? styles.deckFacesSegmentBtnActive : ""
                }`}
                aria-pressed={entriesViewMode === "paired-not-in-set"}
                onClick={() => setEntriesViewMode("paired-not-in-set")}
              >
                Paired (Not In Set) ({pairedNotInSetFrontIds.length})
              </button>
            </div>
            {entriesViewMode === "paired-not-in-set" ? (
              pairedNotInSetFrontIds.length === 0 ? (
                <div className={styles.decksEmpty}>No paired cards pending add.</div>
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
                <div className={styles.decksEmpty}>{t("decks.emptyEntries")}</div>
              )
            ) : (
              <SortableContext items={entryIds} strategy={rectSortingStrategy}>
                <div className={styles.deckEntriesGrid}>
                  {visibleEntries.flatMap((entry, index) => {
                    const rendered: ReactNode[] = [];
                    if (drag.isFrontFaceDragActive && drag.entryDropIndex != null && drag.entryDropIndex === index) {
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
                            }}
                          >
                            {t("actions.remove")}
                          </button>
                        </div>,
                      );
                      return rendered;
                    }
                    rendered.push(
                      <DeckEntryCard
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
                  {drag.isFrontFaceDragActive &&
                  drag.entryDropIndex != null &&
                  drag.entryDropIndex >= visibleEntries.length ? (
                    renderEntryPlaceholder("entry-placeholder-tail")
                  ) : null}
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
        )}
      </div>
      <div className={styles.deckRouteRowFooter} />
    </div>
  );
}
