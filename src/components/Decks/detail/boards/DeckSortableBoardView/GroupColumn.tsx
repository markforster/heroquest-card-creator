"use client";

import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";

import type { GroupColumnProps } from "@/components/Decks/detail/boards/DeckSortableBoardView/types";
import { useI18n } from "@/i18n/I18nProvider";

import styles from "../../DeckGroupsSection2.module.css";

function parseGroupLabel(groupId: string): string {
  return groupId.split(":")[1] ?? groupId;
}

export function GroupColumn({
  boardId,
  index,
  groupId,
  label,
  children,
  fillParent,
  canReceiveDrops,
  showHeader,
  sourceLayout,
  entriesLayout,
  className,
  style,
  bodyClassName,
  bodyStyle,
  onHoverChange,
  allowGroupReorder,
  isGroupDragSource,
}: GroupColumnProps) {
  const { t } = useI18n();
  const droppable = useDroppable({
    id: groupId,
    type: "group",
    accept: [
      ...(canReceiveDrops ? (["set"] as const) : []),
      ...(allowGroupReorder ? (["group"] as const) : []),
    ],
  });
  const { ref, handleRef, isDragging, isDragSource } = useSortable({
    id: groupId,
    index,
    type: "group",
    accept: ["group"],
    group: `board:${boardId}`,
    data: { group: groupId },
    disabled: !allowGroupReorder,
  });

  return (
    <section
      className={[
        styles.group,
        isGroupDragSource || isDragSource ? styles.groupDragGhost : "",
        fillParent ? styles.groupFillParent : "",
        sourceLayout ? styles.groupSource : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      ref={(node) => {
        droppable.ref(node);
        ref(node);
      }}
      data-testid={`group-${groupId}`}
      style={style}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      {allowGroupReorder ? (
        <button
          type="button"
          ref={handleRef}
          className={[
            styles.groupDragHandle,
            isDragging ? styles.groupDragHandleActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={t("decks.groups.actions.reorder")}
          title={t("decks.groups.actions.reorder")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <span aria-hidden="true">⋮⋮</span>
        </button>
      ) : null}
      {showHeader ? (
        <header className={styles.groupHeader}>
          <span>{label ?? parseGroupLabel(groupId)}</span>
          <span className={styles.grip} aria-hidden="true">
            ⠿
          </span>
        </header>
      ) : null}
      <div
        className={[
          styles.groupBody,
          fillParent ? styles.groupBodyFillParent : "",
          sourceLayout ? styles.groupBodySource : "",
          sourceLayout && fillParent ? styles.groupBodySourceFillParent : "",
          entriesLayout && fillParent ? styles.groupBodyEntriesFillParent : "",
          bodyClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={bodyStyle}
      >
        {children}
      </div>
    </section>
  );
}
