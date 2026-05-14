"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import CardFan, { CARD_FAN_SIZES } from "@/components/Decks/CardFan";
import type { CardFanVariant } from "@/components/Decks/CardFan";
import DeckGroupGridItem from "@/components/Decks/DeckGroupGridItem";

import React, { useState } from "react";
import type { ReactNode } from "react";

type DeckGroupGridListProps = {
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  selectedGroupId: string | null;
  selectedSetId: string | null;
  isDropOver: boolean;
  isGroupDragActive?: boolean;
  isSetDragActive?: boolean;
  backFaceDropGroupId?: string | null;
  backFaceDropIndex?: number | null;
  isBackFaceNewGroupEdgeTarget?: boolean;
  dragTargetGroupId?: string | null;
  setDropIndex?: number | null;
  setDropGroupId?: string | null;
  finalizingSetId?: string | null;
  isRemoveZone?: boolean;
  emptyLabel: string;
  onSelectGroup: (groupId: string) => void;
  onSelectSet: (set: DeckSetRecord) => void;
  onDeleteSetFromGroupCard: (setId: string) => Promise<void>;
  groupTileVariant: CardFanVariant;
  rowRef?: (node: HTMLDivElement | null) => void;
};

function GroupDropZoneEmpty({ isOver, label }: { isOver: boolean; label: string }) {
  const { setNodeRef } = useDroppable({ id: "groups-empty" });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckGroupDropZone} ${isOver ? styles.deckGroupDropZoneOver : ""}`}
    >
      {label}
    </div>
  );
}

function GroupDropZoneArea({
  isOver,
  isBackFaceDragActive,
  rowRef,
  children,
}: {
  isOver: boolean;
  isBackFaceDragActive: boolean;
  rowRef?: (node: HTMLDivElement | null) => void;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: "groups-area" });
  return (
    <div
      data-group-row-list="true"
      className={`${styles.deckGroupRowList} ${
        isOver && !isBackFaceDragActive ? styles.deckGroupRowListOver : ""
      }`}
    >
      <div
        ref={(node) => {
          setNodeRef(node);
          rowRef?.(node);
        }}
        className={styles.deckGroupRowContent}
      >
        {children}
      </div>
    </div>
  );
}

export default function DeckGroupGridList({
  groups,
  sets,
  selectedGroupId,
  selectedSetId,
  isDropOver,
  isBackFaceDragActive = false,
  isGroupDragActive = false,
  isSetDragActive = false,
  backFaceDropGroupId = null,
  backFaceDropIndex = null,
  dragTargetGroupId = null,
  dropIndex,
  setDropIndex,
  setDropGroupId,
  finalizingSetId = null,
  isRemoveZone = false,
  emptyLabel,
  onSelectGroup,
  onSelectSet,
  onDeleteSetFromGroupCard,
  groupTileVariant,
  rowRef,
}: DeckGroupGridListProps & { isBackFaceDragActive?: boolean; dropIndex?: number | null }) {
  const tileSize = CARD_FAN_SIZES[groupTileVariant];
  const fixedPreviewHeight = Math.round(tileSize.height + 28);
  const fanTilt = 0.6;
  const fanSpacing = 0.6;
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  return (
    <GroupDropZoneArea isOver={isDropOver} isBackFaceDragActive={isBackFaceDragActive} rowRef={rowRef}>
      {groups.length === 0 ? (
        <GroupDropZoneEmpty isOver={isDropOver} label={emptyLabel} />
      ) : (
        <div
          className={styles.deckNavListRow}
          style={{
            ["--deck-set-w" as string]: `${tileSize.width}px`,
            ["--deck-set-h" as string]: `${tileSize.height}px`,
          }}
        >
          {groups.map((group, index) => {
            const groupSets = sets
              .filter((set) => set.id !== finalizingSetId)
              .filter((set) => set.groupId === group.id)
              .sort((a, b) => a.sortIndex - b.sortIndex);
            const backIds = groupSets.map((set) => set.backFaceId);
            const maxCount = Math.max(backIds.length, 1);
            const isExpanded = selectedGroupId === group.id && groupSets.length > 1;
            const dragExpanded =
              (isBackFaceDragActive || isSetDragActive) &&
              dragTargetGroupId === group.id &&
              groupSets.length > 1;
            const isDragHovering = dragTargetGroupId === group.id && !isExpanded && groupSets.length > 1;
            const isHovering =
              (hoveredGroupId === group.id || isDragHovering) &&
              !isExpanded &&
              groupSets.length > 1;
            const dropPlaceholderIndex =
              isBackFaceDragActive && backFaceDropGroupId === group.id
                ? backFaceDropIndex ?? groupSets.length
                : isSetDragActive &&
                    !isRemoveZone &&
                    setDropGroupId === group.id &&
                    groupSets.length > 0
                  ? setDropIndex ?? groupSets.length
                  : null;
            const preview: ReactNode = (
              <CardFan
                cardIds={backIds}
                variant={groupTileVariant}
                maxCount={maxCount}
                collapsedCoreCount={5}
                spacing={fanSpacing}
                tilt={fanTilt}
                showPlaceholdersWhenEmpty
                className={styles.deckGroupPreviewFan}
                enableHoverBorder
                expanded={isExpanded || dragExpanded}
                hovered={isHovering}
                hoveredCardId={isHovering ? hoveredCardId : null}
                fixedFrameHeight={fixedPreviewHeight}
                dropPlaceholderIndex={dropPlaceholderIndex}
                placeholderVariant={dropPlaceholderIndex != null ? "deck-group-drop" : "default"}
                getDragMeta={(cardId) => {
                  const target = groupSets.find((set) => set.backFaceId === cardId);
                  if (!target) return null;
                  return {
                    id: `set:${target.id}`,
                    data: {
                      type: "set",
                      setId: target.id,
                      groupId: target.groupId,
                      backFaceId: target.backFaceId,
                    },
                  };
                }}
                selectedCardId={
                  selectedSetId
                    ? (groupSets.find((set) => set.id === selectedSetId)?.backFaceId ?? null)
                    : null
                }
                onHoverCard={(cardId) => {
                  setHoveredCardId(cardId);
                }}
                onSelectCard={(cardId) => {
                  const target = groupSets.find((set) => set.backFaceId === cardId);
                  if (target) {
                    onSelectGroup(group.id);
                    onSelectSet(target);
                  }
                }}
                onRemoveCard={
                  isSetDragActive || isBackFaceDragActive || isGroupDragActive
                    ? undefined
                    : (cardId: string) => {
                        const target = groupSets.find((set) => set.backFaceId === cardId);
                        if (!target) return;
                        setHoveredCardId(null);
                        setHoveredGroupId(null);
                        void onDeleteSetFromGroupCard(target.id);
                      }
                }
              />
            );
            return (
              <React.Fragment key={group.id}>
                {((isBackFaceDragActive && !backFaceDropGroupId) ||
                  isGroupDragActive ||
                  (isSetDragActive && !setDropGroupId)) &&
                dropIndex === index ? (
                  <div
                    className={styles.deckGroupDropPlaceholder}
                    data-drop-index={dropIndex}
                    aria-hidden="true"
                  />
                ) : null}
                <DeckGroupGridItem
                  group={group}
                  isSelected={selectedGroupId === group.id}
                  onSelect={() => {
                    onSelectGroup(group.id);
                    if (groupSets.length > 0) {
                      onSelectSet(groupSets[0]);
                    }
                  }}
                  onHoverChange={(isHovering) => {
                    if (isHovering) {
                      setHoveredGroupId(group.id);
                      setHoveredCardId(null);
                    } else {
                      setHoveredGroupId(null);
                      setHoveredCardId(null);
                    }
                  }}
                  preview={preview}
                />
              </React.Fragment>
            );
          })}
          {((isBackFaceDragActive && !backFaceDropGroupId) ||
            isGroupDragActive ||
            (isSetDragActive && !setDropGroupId)) &&
          (dropIndex ?? groups.length) >= groups.length ? (
            <div
              className={styles.deckGroupDropPlaceholder}
              data-drop-index={dropIndex ?? groups.length}
              aria-hidden="true"
            />
          ) : null}
        </div>
      )}
    </GroupDropZoneArea>
  );
}
