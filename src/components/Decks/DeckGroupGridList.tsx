"use client";

import { useDroppable } from "@dnd-kit/core";

import type { DeckGroupRecord, DeckSetRecord } from "@/api/decks";
import styles from "@/app/page.module.css";
import CardFan, { CARD_FAN_SIZES } from "@/components/Decks/CardFan";
import type { CardFanVariant } from "@/components/Decks/CardFan";
import DeckGroupGridItem from "@/components/Decks/DeckGroupGridItem";

import type { CSSProperties, ReactNode } from "react";

type DeckGroupGridListProps = {
  groups: DeckGroupRecord[];
  sets: DeckSetRecord[];
  selectedGroupId: string | null;
  isDropOver: boolean;
  emptyLabel: string;
  onSelectGroup: (groupId: string) => void;
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
  isDropOver,
  emptyLabel,
  onSelectGroup,
  groupTileVariant,
}: DeckGroupGridListProps) {
  const tileSize = CARD_FAN_SIZES[groupTileVariant];
  const fanTilt = 0.6;
  const fanSpacing = 0.6;
  const fanMaxOffsetPx = 8;
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
            const fanCount = previewIds.length > 0 ? previewIds.length : 5;
            const fanWidth = tileSize.width + (fanCount - 1) * fanMaxOffsetPx * fanSpacing;
            const itemStyle: CSSProperties = {
              ["--card-fan-width" as string]: `${fanWidth}px`,
            };
            const preview: ReactNode = (
              <CardFan
                cardIds={previewIds}
                variant={groupTileVariant}
                maxCount={5}
                spacing={fanSpacing}
                tilt={fanTilt}
                showPlaceholdersWhenEmpty
                className={styles.deckGroupPreviewFan}
              />
            );
            return (
              <DeckGroupGridItem
                key={group.id}
                group={group}
                isSelected={selectedGroupId === group.id}
                onSelect={() => onSelectGroup(group.id)}
                preview={preview}
                style={itemStyle}
              />
            );
          })}
        </div>
      )}
    </GroupDropZoneArea>
  );
}
