import { act, renderHook } from "@testing-library/react";

import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";

describe("useDecksDragController onDragEnd set cross-group move", () => {
  function renderController({
    sets,
    selectedSetId = null,
  }: {
    sets: Array<{ id: string; groupId: string; backFaceId: string; sortIndex: number }>;
    selectedSetId?: string | null;
  }) {
    const updateDeckSetGroup = jest.fn().mockResolvedValue(undefined);
    const reorderDeckSets = jest.fn().mockResolvedValue(undefined);
    const deleteDeckGroup = jest.fn().mockResolvedValue(undefined);
    const reloadStructure = jest.fn().mockResolvedValue(undefined);
    const setSelectedGroupId = jest.fn();

    const groupBySetId = new Map<string, string>();
    for (const set of sets) groupBySetId.set(set.id, set.groupId);

    const hook = renderHook(() =>
      useDecksDragController({
        deckId: "deck-1",
        orderedGroups: [
          { id: "group-1", title: "Group 1", sortIndex: 0 },
          { id: "group-2", title: "Group 2", sortIndex: 1 },
        ] as never,
        sets: sets as never,
        groupBySetId,
        selectedGroupId: "group-1",
        selectedSetId,
        activeSetId: null,
        entries: [],
        entryFrontIdByEntryId: new Map(),
        setSelectedGroupId,
        createSetFromBackFace: jest.fn(),
        addFrontFaceToSet: jest.fn(),
        reorderSetEntries: jest.fn(),
        createDeckGroup: jest.fn(),
        reorderDeckGroups: jest.fn(),
        reorderDeckSets,
        updateDeckSetGroup,
        deleteDeckSet: jest.fn(),
        deleteDeckGroup,
        reloadStructure,
        refreshSetEntries: jest.fn(),
      }),
    );

    return {
      ...hook,
      updateDeckSetGroup,
      reorderDeckSets,
      deleteDeckGroup,
      reloadStructure,
      setSelectedGroupId,
    };
  }

  it("moves a set into another group and deletes the source group if it becomes empty", async () => {
    const { result, updateDeckSetGroup, reorderDeckSets, deleteDeckGroup } = renderController({
      sets: [{ id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
      selectedSetId: "set-1",
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { id: "set:set-1", data: { current: { type: "set", setId: "set-1" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { id: "set:set-1", data: { current: { type: "set", setId: "set-1" } } },
        over: { id: "group:group-2" },
      } as never);
    });

    expect(updateDeckSetGroup).toHaveBeenCalledWith("set-1", "group-2");
    expect(reorderDeckSets).toHaveBeenCalled();
    expect(deleteDeckGroup).toHaveBeenCalledWith("group-1");
  });

  it("does not delete the source group when it still contains sets after the move", async () => {
    const { result, deleteDeckGroup } = renderController({
      sets: [
        { id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 },
        { id: "set-2", groupId: "group-1", backFaceId: "back-2", sortIndex: 1 },
      ],
      selectedSetId: "set-1",
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { id: "set:set-1", data: { current: { type: "set", setId: "set-1" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { id: "set:set-1", data: { current: { type: "set", setId: "set-1" } } },
        over: { id: "group:group-2" },
      } as never);
    });

    expect(deleteDeckGroup).not.toHaveBeenCalled();
  });
});

