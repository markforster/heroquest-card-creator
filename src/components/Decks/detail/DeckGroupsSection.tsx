"use client";

import styles from "@/app/page.module.css";
import DeckGroupGridList from "@/components/Decks/DeckGroupGridList";
import { useDeckDetailSelection } from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import type { DeckDetailDragState } from "@/components/Decks/types/deck-detail";
import { useI18n } from "@/i18n/I18nProvider";

export default function DeckGroupsSection({
  groupTileVariant,
  drag,
  rowRef,
  onDeleteSetFromGroupCard,
}: {
  groupTileVariant: "xs" | "sm" | "smMd" | "lg";
  drag: DeckDetailDragState;
  rowRef: (node: HTMLDivElement | null) => void;
  onDeleteSetFromGroupCard: (setId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { orderedGroups, sets, selectedGroupId, selectedSetId, selectGroup, selectSet } =
    useDeckDetailSelection();
  return (
    <div className={styles.deckRouteRow}>
      <div className={styles.deckRouteRowBody}>
        <div className={styles.deckGroupRow}>
          <DeckGroupGridList
            groups={orderedGroups}
            sets={sets}
            selectedGroupId={selectedGroupId}
            selectedSetId={selectedSetId}
            isDropOver={drag.isGroupDropOver}
            isBackFaceDragActive={drag.isBackFaceDragActive}
            isGroupDragActive={drag.isGroupDragActive}
            isSetDragActive={drag.isSetDragActive}
            backFaceDropGroupId={drag.backFaceDropGroupId}
            backFaceDropIndex={drag.backFaceDropIndex}
            isBackFaceNewGroupEdgeTarget={drag.isBackFaceNewGroupEdgeTarget}
            dragTargetGroupId={drag.dragTargetGroupId}
            dropIndex={drag.groupDropIndex}
            setDropIndex={drag.setDropIndex}
            setDropGroupId={drag.setDropGroupId}
            isRemoveZone={drag.isRemoveZone}
            emptyLabel={t("decks.emptyGroups")}
            onSelectGroup={selectGroup}
            onSelectSet={selectSet}
            onDeleteSetFromGroupCard={onDeleteSetFromGroupCard}
            groupTileVariant={groupTileVariant}
            rowRef={rowRef}
          />
        </div>
      </div>
      <div className={styles.deckRouteRowFooter} />
    </div>
  );
}
