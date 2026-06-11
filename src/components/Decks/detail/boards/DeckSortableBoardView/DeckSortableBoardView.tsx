"use client";

import { Fragment, useMemo, useState } from "react";

import { getBlockedBoundaries } from "@/components/Decks/detail/boards/deck-board-adapters";
import {
  countRenderableSets,
  isEmptySlotEphemeralSetId,
  isSourceEphemeralSetId,
} from "@/components/Decks/detail/boards/deck-board-dnd-state";
import type {
  GroupId,
  GroupVisualContext,
} from "@/components/Decks/detail/boards/deck-board-types";
import {
  DraggableSetCard,
  EmptySlotDropCard,
  SortableSetCard,
} from "@/components/Decks/detail/boards/DeckBoardCards";
import { BoardDropSurface } from "@/components/Decks/detail/boards/DeckSortableBoardView/BoardDropSurface";
import { CreateBoundaryPlaceholder } from "@/components/Decks/detail/boards/DeckSortableBoardView/CreateBoundaryPlaceholder";
import { GroupColumn } from "@/components/Decks/detail/boards/DeckSortableBoardView/GroupColumn";
import type {
  DeckSortableBoardViewProps,
} from "@/components/Decks/detail/boards/DeckSortableBoardView/types";

import styles from "../../DeckGroupsSection2.module.css";

const SHOW_GROUP_HEADINGS = false;

export function DeckSortableBoardView({
  model,
  layoutMode = "content",
}: DeckSortableBoardViewProps) {
  const {
    config,
    groupIds,
    itemsByGroup,
    activeSetId,
    activeGroupId,
    activeTargetBoardId,
    hoverBoundaryIndex,
  } = model;
  const useFillParent = layoutMode === "fill-parent" && !config.allowMultipleGroups;
  const isSourceBoard = config.boardId === "source";
  const isEntriesBoard = config.boardId === "entries";
  const blockedBoundaries = useMemo(
    () => getBlockedBoundaries(groupIds, itemsByGroup),
    [groupIds, itemsByGroup],
  );
  const hideCreateBoundariesForBootstrapEmptyState =
    config.boardId === "groups" &&
    groupIds.length === 1 &&
    countRenderableSets(itemsByGroup[groupIds[0]] ?? []) === 0;
  const [hoveredGroupId, setHoveredGroupId] = useState<GroupId | null>(null);

  return (
    <section
      className={[styles.board, useFillParent ? styles.boardFillParent : ""]
        .concat(isSourceBoard ? [" ", styles.boardSource] : [])
        .concat(model.showDropAffordance ? [" ", styles.boardDropActive] : [])
        .concat(
          model.showDropAffordance && activeTargetBoardId === config.boardId
            ? [" ", styles.boardDropOver]
            : [],
        )
        .filter(Boolean)
        .join(" ")}
      data-testid={`board-${config.boardId}`}
    >
      {config.boardId === "source" ? null : (
        <header className={styles.boardHeader}>
          <span>{config.title}</span>
          {model.renderBoardHeaderActions ? (
            <span className={styles.boardHeaderActions}>{model.renderBoardHeaderActions()}</span>
          ) : null}
        </header>
      )}
      <BoardDropSurface
        boardId={config.boardId}
        canReceiveDrops={config.allowDropTarget}
        className={[
          styles.groupsRow,
          useFillParent ? styles.groupsRowFillParent : "",
          isSourceBoard ? styles.groupsRowSource : "",
        ]
          .filter(Boolean)
          .join(" ")}
        testId={`groups-row-${config.boardId}`}
        onPointerMove={(event) => model.onHoverBoundary(event.clientX)}
        onMouseMove={(event) => model.onHoverBoundary(event.clientX)}
        onMouseLeave={model.onLeaveBoard}
      >
        {groupIds.map((groupId, index) => (
          <div key={groupId} className={styles.groupStack}>
            {config.allowGroupCreate && !hideCreateBoundariesForBootstrapEmptyState ? (
              <CreateBoundaryPlaceholder
                index={index}
                onCreate={model.onCreateGroupAtIndex}
                onHoverChange={model.onBoundaryHoverChange}
                visible={
                  !activeSetId &&
                  !activeGroupId &&
                  hoverBoundaryIndex === index &&
                  !blockedBoundaries.has(index)
                }
              />
            ) : null}
            <div
              className={useFillParent ? styles.groupWrapperFillParent : ""}
              ref={(node) => model.registerGroupRef(groupId, node)}
            >
              <GroupColumn
                boardId={config.boardId}
                index={index}
                groupId={groupId}
                label={model.groupLabelsById[groupId]}
                fillParent={useFillParent}
                canReceiveDrops={config.allowDropTarget}
                showHeader={SHOW_GROUP_HEADINGS}
                sourceLayout={isSourceBoard}
                entriesLayout={isEntriesBoard}
                className={
                  model.resolveGroupClassName?.({
                    boardId: config.boardId,
                    groupId,
                    isHovered: hoveredGroupId === groupId,
                    hasSelectedSet: (itemsByGroup[groupId] ?? []).some(
                      (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                    ),
                    setCount: countRenderableSets(itemsByGroup[groupId] ?? []),
                  }) ?? undefined
                }
                style={model.resolveGroupStyle?.({
                  boardId: config.boardId,
                  groupId,
                  isHovered: hoveredGroupId === groupId,
                  hasSelectedSet: (itemsByGroup[groupId] ?? []).some(
                    (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                  ),
                  setCount: countRenderableSets(itemsByGroup[groupId] ?? []),
                })}
                bodyClassName={
                  model.resolveGroupBodyClassName?.({
                    boardId: config.boardId,
                    groupId,
                    isHovered: hoveredGroupId === groupId,
                    hasSelectedSet: (itemsByGroup[groupId] ?? []).some(
                      (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                    ),
                    setCount: countRenderableSets(itemsByGroup[groupId] ?? []),
                  }) ?? undefined
                }
                bodyStyle={model.resolveGroupBodyStyle?.({
                  boardId: config.boardId,
                  groupId,
                  isHovered: hoveredGroupId === groupId,
                  hasSelectedSet: (itemsByGroup[groupId] ?? []).some(
                    (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                  ),
                  setCount: countRenderableSets(itemsByGroup[groupId] ?? []),
                })}
                onHoverChange={(isHovered) => {
                  setHoveredGroupId((current) => {
                    if (isHovered) return groupId;
                    return current === groupId ? null : current;
                  });
                }}
                allowGroupReorder={
                  config.boardId === "groups" &&
                  Boolean(model.allowGroupReorder) &&
                  groupIds.length > 1
                }
                isGroupDragSource={activeGroupId === groupId}
              >
                {(() => {
                  const groupSetIds = itemsByGroup[groupId] ?? [];
                  const hasSelectedSet = groupSetIds.some(
                    (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                  );
                  const groupVisualContext: GroupVisualContext = {
                    boardId: config.boardId,
                    groupId,
                    isHovered: hoveredGroupId === groupId,
                    hasSelectedSet,
                    setCount: countRenderableSets(groupSetIds),
                  };

                  return groupSetIds.map((setId, setIndex) => (
                    <Fragment key={setId}>
                      {config.allowInGroupSort && isEmptySlotEphemeralSetId(setId) ? (
                        <EmptySlotDropCard
                          setId={setId}
                          groupId={groupId}
                          sourceLayout={isSourceBoard}
                          renderContent={model.renderSetContent}
                          shellClassName={
                            model.resolveSetShellClassName?.({
                              ...groupVisualContext,
                              setId,
                              setIndex,
                            }) ?? undefined
                          }
                          shellStyle={model.resolveSetShellStyle?.({
                            ...groupVisualContext,
                            setId,
                            setIndex,
                          })}
                        />
                      ) : null}
                      {config.allowInGroupSort && !isEmptySlotEphemeralSetId(setId) ? (
                        <SortableSetCard
                          boardId={config.boardId}
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          cardId={model.setCardIdById[setId]}
                          index={setIndex}
                          groupId={groupId}
                          renderContent={model.renderSetContent}
                          isSelected={model.isSetSelected?.(setId, groupId) ?? false}
                          isEphemeral={isSourceEphemeralSetId(setId)}
                          renderTopToolbar={model.renderTopToolbar}
                          renderBottomToolbar={model.renderBottomToolbar}
                          sourceLayout={isSourceBoard}
                          shellClassName={
                            model.resolveSetShellClassName?.({
                              ...groupVisualContext,
                              setId,
                              setIndex,
                            }) ?? undefined
                          }
                          shellStyle={model.resolveSetShellStyle?.({
                            ...groupVisualContext,
                            setId,
                            setIndex,
                          })}
                          onClick={(event) => {
                            if (model.activeSetId) return;
                            model.onSetClick?.(setId, groupId, {
                              additive: event.metaKey || event.ctrlKey,
                            });
                          }}
                          onHoverChange={(isHovered) =>
                            model.onSetHoverChange?.({
                              boardId: config.boardId,
                              groupId,
                              setId,
                              isHovered,
                            })}
                        />
                      ) : null}
                      {!config.allowInGroupSort ? (
                        <DraggableSetCard
                          boardId={config.boardId}
                          setId={setId}
                          label={model.setLabelsById[setId]}
                          cardId={model.setCardIdById[setId]}
                          groupId={groupId}
                          renderContent={model.renderSetContent}
                          isSelected={model.isSetSelected?.(setId, groupId) ?? false}
                          isEphemeral={isSourceEphemeralSetId(setId)}
                          renderTopToolbar={model.renderTopToolbar}
                          renderBottomToolbar={model.renderBottomToolbar}
                          sourceLayout={isSourceBoard}
                          shellClassName={
                            model.resolveSetShellClassName?.({
                              ...groupVisualContext,
                              setId,
                              setIndex,
                            }) ?? undefined
                          }
                          shellStyle={model.resolveSetShellStyle?.({
                            ...groupVisualContext,
                            setId,
                            setIndex,
                          })}
                          onClick={(event) => {
                            if (model.activeSetId) return;
                            model.onSetClick?.(setId, groupId, {
                              additive: event.metaKey || event.ctrlKey,
                            });
                          }}
                          onHoverChange={(isHovered) =>
                            model.onSetHoverChange?.({
                              boardId: config.boardId,
                              groupId,
                              setId,
                              isHovered,
                            })}
                        />
                      ) : null}
                    </Fragment>
                  ));
                })()}
                {model.renderGroupOverlay?.({
                  boardId: config.boardId,
                  groupId,
                  isHovered: hoveredGroupId === groupId,
                  hasSelectedSet: (itemsByGroup[groupId] ?? []).some(
                    (setId) => model.isSetSelected?.(setId, groupId) ?? false,
                  ),
                  setCount: countRenderableSets(itemsByGroup[groupId] ?? []),
                  setIds: itemsByGroup[groupId] ?? [],
                })}
                {countRenderableSets(itemsByGroup[groupId] ?? []) === 0 && model.emptyMessage ? (
                  <div className={styles.groupEmptyMessage}>{model.emptyMessage}</div>
                ) : null}
              </GroupColumn>
            </div>
          </div>
        ))}

        {config.allowGroupCreate && !hideCreateBoundariesForBootstrapEmptyState ? (
          <CreateBoundaryPlaceholder
            index={groupIds.length}
            onCreate={model.onCreateGroupAtIndex}
            onHoverChange={model.onBoundaryHoverChange}
            visible={
              !activeSetId &&
              !activeGroupId &&
              hoverBoundaryIndex === groupIds.length &&
              !blockedBoundaries.has(groupIds.length)
            }
          />
        ) : null}
      </BoardDropSurface>
    </section>
  );
}
