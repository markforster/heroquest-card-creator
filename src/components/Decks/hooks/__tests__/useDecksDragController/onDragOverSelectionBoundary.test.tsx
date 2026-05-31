import { act, renderHook } from "@testing-library/react";

import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";

describe("useDecksDragController onDragOver selection boundary", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  function renderController(overrides?: {
    sets?: Array<{ id: string; groupId: string; backFaceId: string; sortIndex: number }>;
    groupBySetId?: Map<string, string>;
  }) {
    const setSelectedGroupId = jest.fn();
    const createSetFromBackFace = jest.fn().mockResolvedValue({
      id: "created-set",
      groupId: "group-2",
      backFaceId: "back-created",
    });
    const createDeckGroup = jest.fn();

    const hook = renderHook(() =>
      useDecksDragController({
        deckId: "deck-1",
        orderedGroups: [
          { id: "group-1", title: "Group 1", sortIndex: 0 },
          { id: "group-2", title: "Group 2", sortIndex: 1 },
        ] as never,
        sets: (overrides?.sets ?? []) as never,
        groupBySetId: overrides?.groupBySetId ?? new Map(),
        selectedGroupId: "group-1",
        selectedSetId: null,
        activeSetId: null,
        entries: [],
        entryFrontIdByEntryId: new Map(),
        setSelectedGroupId,
        createSetFromBackFace,
        addFrontFaceToSet: jest.fn(),
        reorderSetEntries: jest.fn(),
        createDeckGroup,
        reorderDeckGroups: jest.fn(),
        reorderDeckSets: jest.fn(),
        updateDeckSetGroup: jest.fn(),
        deleteDeckSet: jest.fn(),
        deleteDeckGroup: jest.fn(),
        reloadStructure: jest.fn(),
        refreshSetEntries: jest.fn(),
      }),
    );

    return { ...hook, setSelectedGroupId, createSetFromBackFace, createDeckGroup };
  }

  it("tracks a temporary drag target group without mutating committed selection", () => {
    const { result, setSelectedGroupId } = renderController();

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "set" } } },
        over: { id: "group:group-2" },
      } as never);
    });

    expect(result.current.dragState.dragTargetGroupId).toBe("group-2");
    expect(setSelectedGroupId).not.toHaveBeenCalled();
  });

  it("tracks a temporary drag target group when hovering a set droppable id", () => {
    const { result } = renderController({
      groupBySetId: new Map([["set-2", "group-2"]]),
    });

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "set" } } },
        over: { id: "set:set-2" },
      } as never);
    });

    expect(result.current.dragState.dragTargetGroupId).toBe("group-2");
  });

  it("clears the temporary drag target when the drag leaves a group target", () => {
    const { result } = renderController();

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "back-face" } } },
        over: { id: "group:group-2" },
      } as never);
    });

    expect(result.current.dragState.dragTargetGroupId).toBe("group-2");

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "back-face" } } },
        over: { id: "groups-area" },
      } as never);
    });

    expect(result.current.dragState.dragTargetGroupId).toBeNull();
  });

  it("marks the pinned new-group edge as a distinct back-face target", () => {
    const { result, setSelectedGroupId } = renderController();
    const row = document.createElement("div");

    act(() => {
      result.current.groupRowRef(row);
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "back-face", backFaceId: "back-1" } } },
      } as never);
    });
    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "back-face" } } },
        over: { id: "groups-new-group-right-edge" },
      } as never);
    });
    act(() => {
      result.current.dndHandlers.onDragMove({
        active: {
          rect: {
            current: {
              translated: { left: 180, top: 10, width: 20, height: 20 },
              initial: { left: 180, top: 10, width: 20, height: 20 },
            },
          },
        },
      } as never);
    });

    expect(result.current.dragState.dragTargetGroupId).toBeNull();
    expect(result.current.dragState.isBackFaceNewGroupEdgeTarget).toBe(true);
    expect(result.current.dragState.groupDropIndex).toBe(2);
    expect(setSelectedGroupId).not.toHaveBeenCalled();
  });

  it("computes inside-group back-face insertion separately from the new-group edge", () => {
    const { result } = renderController();
    const row = document.createElement("div");
    const group = document.createElement("div");
    group.dataset.groupId = "group-2";
    const setA = document.createElement("div");
    setA.dataset.setId = "set-a";
    Object.defineProperty(setA, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 40 }),
    });
    const setB = document.createElement("div");
    setB.dataset.setId = "set-b";
    Object.defineProperty(setB, "getBoundingClientRect", {
      value: () => ({ left: 80, width: 40 }),
    });
    group.appendChild(setA);
    group.appendChild(setB);
    row.appendChild(group);

    act(() => {
      result.current.groupRowRef(row);
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "back-face", backFaceId: "back-1" } } },
      } as never);
    });
    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "back-face" } } },
        over: { id: "group:group-2" },
      } as never);
    });
    act(() => {
      result.current.dndHandlers.onDragMove({
        active: {
          rect: {
            current: {
              translated: { left: 30, top: 10, width: 20, height: 20 },
              initial: { left: 30, top: 10, width: 20, height: 20 },
            },
          },
        },
      } as never);
    });

    expect(result.current.dragState.backFaceDropGroupId).toBe("group-2");
    expect(result.current.dragState.backFaceDropIndex).toBe(1);
    expect(result.current.dragState.isBackFaceNewGroupEdgeTarget).toBe(false);
  });

  it("ignores duplicate back-face drop when that back face is already used in the deck", async () => {
    const { result, createSetFromBackFace, createDeckGroup } = renderController({
      sets: [{ id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }],
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "back-face", backFaceId: "back-1" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "back-face", backFaceId: "back-1" } } },
        over: { id: "groups-area" },
      } as never);
    });

    expect(createSetFromBackFace).not.toHaveBeenCalled();
    expect(createDeckGroup).not.toHaveBeenCalled();
    expect(result.current.dragState.isBackFaceDragActive).toBe(false);
    expect(result.current.dragState.backFaceDropGroupId).toBeNull();
    expect(result.current.dragState.isBackFaceNewGroupEdgeTarget).toBe(false);
  });

  it("clears back-face drag state immediately on valid drop before async mutations resolve", async () => {
    const { result, createSetFromBackFace } = renderController();
    const pendingCreate = deferred<{ id: string; groupId: string; backFaceId: string }>();
    createSetFromBackFace.mockImplementationOnce(() => pendingCreate.promise);

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "back-face", backFaceId: "back-2" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "back-face", backFaceId: "back-2" } } },
        over: { id: "group:group-2" },
      } as never);
      void result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "back-face", backFaceId: "back-2" } } },
        over: { id: "group:group-2" },
      } as never);
    });

    expect(result.current.dragState.isBackFaceDragActive).toBe(false);
    expect(result.current.dragState.dragActiveBackFaceId).toBeNull();
    expect(result.current.dragState.groupDropIndex).toBeNull();

    await act(async () => {
      pendingCreate.resolve({
        id: "created-set-2",
        groupId: "group-2",
        backFaceId: "back-2",
      });
      await pendingCreate.promise;
    });
  });

  it("clears back-face drag state immediately on invalid drop", async () => {
    const { result, createSetFromBackFace } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "back-face", backFaceId: "back-3" } } },
      } as never);
      void result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "back-face", backFaceId: "back-3" } } },
        over: null,
      } as never);
    });

    expect(result.current.dragState.isBackFaceDragActive).toBe(false);
    expect(result.current.dragState.dragActiveBackFaceId).toBeNull();
    expect(result.current.dragState.groupDropIndex).toBeNull();
    expect(createSetFromBackFace).not.toHaveBeenCalled();
  });
});
