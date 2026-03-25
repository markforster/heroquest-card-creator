"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import CardFan, { CARD_FAN_SIZES } from "@/components/Decks/CardFan";
import type { CardFanVariant } from "@/components/Decks/CardFan";
import DeckGroupGridItem from "@/components/Decks/DeckGroupGridItem";

import { useState } from "react";
import type { ReactNode } from "react";

type DeckGroupGridListProps = {
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  selectedGroupId: string | null;
  selectedSetId: string | null;
  isDropOver: boolean;
  emptyLabel: string;
  onSelectGroup: (groupId: string) => void;
  onSelectSet: (set: DeckSetRecord) => void;
  groupTileVariant: CardFanVariant;
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

function GroupDropZoneArea({ isOver, children }: { isOver: boolean; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "groups-area" });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.deckGroupRowList} ${isOver ? styles.deckGroupRowListOver : ""}`}
    >
      {children}
    </div>
  );
}

export default function DeckGroupGridList({
  groups,
  sets,
  selectedGroupId,
  selectedSetId,
  isDropOver,
  emptyLabel,
  onSelectGroup,
  onSelectSet,
  groupTileVariant,
}: DeckGroupGridListProps) {
  const tileSize = CARD_FAN_SIZES[groupTileVariant];
  const fanTilt = 0.6;
  const fanSpacing = 0.6;
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  return (
    <GroupDropZoneArea isOver={isDropOver}>
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
          {groups.map((group) => {
            const groupSets = sets
              .filter((set) => set.groupId === group.id)
              .sort((a, b) => a.sortIndex - b.sortIndex);
            const backIds = groupSets.map((set) => set.backFaceId);
            const previewIds = backIds.slice(0, 5);
            const isExpanded = selectedGroupId === group.id && groupSets.length > 1;
            const isHovering = hoveredGroupId === group.id && !isExpanded && groupSets.length > 1;
            const expandedIds = isExpanded || isHovering ? backIds : previewIds;
            // const effectiveSpacing = isExpanded ? 1 : fanSpacing;
            const preview: ReactNode = (
                <CardFan
                  cardIds={expandedIds}
                  variant={groupTileVariant}
                  maxCount={isExpanded || isHovering ? expandedIds.length : 5}
                  stableBaseCount={5}
                  spacing={fanSpacing}
                  tilt={fanTilt}
                  showPlaceholdersWhenEmpty
                className={styles.deckGroupPreviewFan}
                expanded={isExpanded}
                hovered={isHovering}
                selectedCardId={
                  selectedSetId
                    ? (groupSets.find((set) => set.id === selectedSetId)?.backFaceId ?? null)
                    : null
                }
                onSelectCard={(cardId) => {
                  const target = groupSets.find((set) => set.backFaceId === cardId);
                  if (target) {
                    onSelectGroup(group.id);
                    onSelectSet(target);
                  }
                }}
              />
            );
            return (
              <DeckGroupGridItem
                key={group.id}
                group={group}
                isSelected={selectedGroupId === group.id}
                onSelect={() => {
                  onSelectGroup(group.id);
                  if (groupSets.length > 0) {
                    onSelectSet(groupSets[0]);
                  }
                }}
                onHoverChange={(isHovering) => setHoveredGroupId(isHovering ? group.id : null)}
                preview={preview}
              />
            );
          })}
        </div>
      )}
    </GroupDropZoneArea>
  );
}
