import { act, renderHook } from "@testing-library/react";

import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";

describe("useDecksDragController front/entry drop index targeting", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  function renderController(
    options?: { entries?: Array<{ id: string; sortIndex: number; setId: string; pairId: string }> },
  ) {
    const reorderSetEntries = jest.fn().mockResolvedValue(undefined);
    const refreshSetEntries = jest.fn().mockResolvedValue(undefined);
    const addFrontFaceToSet = jest
      .fn()
      .mockResolvedValue([{ id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" }]);

    const hook = renderHook(() =>
      useDecksDragController({
        deckId: "deck-1",
        orderedGroups: [{ id: "group-1", title: "Group 1", sortIndex: 0 }] as never,
        sets: [{ id: "set-1", groupId: "group-1", backFaceId: "back-1", sortIndex: 0 }] as never,
        groupBySetId: new Map([["set-1", "group-1"]]),
        selectedGroupId: "group-1",
        selectedSetId: "set-1",
        activeSetId: "set-1",
        entries:
          (options?.entries ?? [
            { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
            { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
          ]) as never,
        entryFrontIdByEntryId: new Map([
          ["entry-1", "front-1"],
          ["entry-2", "front-2"],
        ]),
        setSelectedGroupId: jest.fn(),
        createSetFromBackFace: jest.fn(),
        addFrontFaceToSet,
        reorderSetEntries,
        createDeckGroup: jest.fn(),
        reorderDeckGroups: jest.fn(),
        reorderDeckSets: jest.fn(),
        updateDeckSetGroup: jest.fn(),
        deleteDeckSet: jest.fn(),
        deleteDeckGroup: jest.fn(),
        reloadStructure: jest.fn(),
        refreshSetEntries,
      }),
    );

    return { ...hook, reorderSetEntries, refreshSetEntries, addFrontFaceToSet };
  }

  it("sets front-face drop index from hovered entry and tail targets", () => {
    const { result } = renderController();

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
      jest.advanceTimersByTime(60);
    });

    expect(result.current.dragState.entryDropIndex).toBe(1);

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
      jest.advanceTimersByTime(60);
    });

    expect(result.current.dragState.entryDropIndex).toBe(2);
  });

  it("updates entry drop index immediately on drag-over (no debounce)", () => {
    const { result } = renderController({
      entries: [
        { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
        { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
        { id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" },
      ],
    });

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
        over: { id: "entry-2" },
      } as never);
    });

    expect(result.current.dragState.entryDropIndex).toBe(1);
  });

  it("keeps committed front-face placeholder index stable through transient over-null flaps", () => {
    const { result } = renderController();

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
    });
    expect(result.current.dragState.entryDropIndex).toBe(1);

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: null,
      } as never);
      jest.advanceTimersByTime(10);
    });
    expect(result.current.dragState.entryDropIndex).toBe(1);

    act(() => {
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
      jest.advanceTimersByTime(40);
    });
    expect(result.current.dragState.entryDropIndex).toBe(1);
  });

  it("clears pending over-stability timer on drag cancel", () => {
    const { result } = renderController();

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: null,
      } as never);
      result.current.dndHandlers.onDragCancel();
      jest.advanceTimersByTime(50);
    });

    expect(result.current.dragState.entryDropIndex).toBe(null);
  });

  it("ignores front-face drop outside entries namespace", async () => {
    const { result, addFrontFaceToSet } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "group:group-1" },
      } as never);
    });

    expect(addFrontFaceToSet).not.toHaveBeenCalled();
  });

  it("clears front-face drag state immediately on valid drop before async mutations resolve", async () => {
    const { result, addFrontFaceToSet } = renderController();
    const pendingAdd = deferred<Array<{ id: string; sortIndex: number; setId: string; pairId: string }>>();
    addFrontFaceToSet.mockImplementationOnce(() => pendingAdd.promise);

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
      void result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
    });

    expect(result.current.dragState.isFrontFaceDragActive).toBe(false);
    expect(result.current.dragState.dragActiveFrontFaceId).toBeNull();
    expect(result.current.dragState.entryDropIndex).toBeNull();

    await act(async () => {
      pendingAdd.resolve([{ id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" }]);
      await pendingAdd.promise;
    });
  });

  it("clears front-face drag state immediately on invalid drop", async () => {
    const { result, addFrontFaceToSet } = renderController();

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      void result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "group:group-1" },
      } as never);
    });

    expect(result.current.dragState.isFrontFaceDragActive).toBe(false);
    expect(result.current.dragState.dragActiveFrontFaceId).toBeNull();
    expect(result.current.dragState.entryDropIndex).toBeNull();
    expect(addFrontFaceToSet).not.toHaveBeenCalled();
  });

  it("inserts newly added front-face entry at hovered middle index", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith("set-1", ["entry-1", "entry-3", "entry-2"]);
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("inserts newly added front-face entry at tail when dropped on entries tail", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith("set-1", ["entry-1", "entry-2", "entry-3"]);
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("skips reorder and refreshes when add returns no created entries", async () => {
    const { result, addFrontFaceToSet, reorderSetEntries, refreshSetEntries } = renderController();
    addFrontFaceToSet.mockResolvedValueOnce([]);

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entries-tail" },
      } as never);
    });

    expect(reorderSetEntries).not.toHaveBeenCalled();
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("uses first created entry when add returns multiple entries", async () => {
    const { result, addFrontFaceToSet, reorderSetEntries, refreshSetEntries } = renderController();
    addFrontFaceToSet.mockResolvedValueOnce([
      { id: "entry-a", sortIndex: 2, setId: "set-1", pairId: "pair-a" },
      { id: "entry-b", sortIndex: 3, setId: "set-1", pairId: "pair-b" },
    ]);

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "front-face", frontFaceId: "front-new" } } },
        over: { id: "entry:entry-2" },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith("set-1", ["entry-1", "entry-a", "entry-2"]);
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("reorders entry using over-id derived tail index with active entry excluded", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "entries-tail" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "entries-tail" },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith("set-1", ["entry-2", "entry-1"]);
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("reorders entry to hovered middle index", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController({
      entries: [
        { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
        { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
        { id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" },
      ],
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
        over: { id: "entry-2" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
        over: { id: "entry-2" },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith("set-1", ["entry-1", "entry-3", "entry-2"]);
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("clears entry-drag state immediately on reorder drop before async reorder resolves", async () => {
    const { result, reorderSetEntries } = renderController();
    const pending = deferred<void>();
    reorderSetEntries.mockImplementationOnce(() => pending.promise);

    act(() => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "entry-2" },
      } as never);
      void result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "entry-2" },
      } as never);
    });

    expect(result.current.dragState.isEntryDragActive).toBe(false);
    expect(result.current.dragState.dragActiveEntryId).toBeNull();
    expect(result.current.dragState.entryDropIndex).toBeNull();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
  });

  it("reorders entry forward to 4th position when dropping on right half of the 4th card", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController({
      entries: [
        { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
        { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
        { id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" },
        { id: "entry-4", sortIndex: 3, setId: "set-1", pairId: "pair-4" },
        { id: "entry-5", sortIndex: 4, setId: "set-1", pairId: "pair-5" },
      ],
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-2" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: {
          data: { current: { type: "entry", entryId: "entry-2" } },
          rect: { current: { translated: { left: 121, width: 20 } } },
        },
        over: { id: "entry-4", rect: { left: 100, width: 20 } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: {
          data: { current: { type: "entry", entryId: "entry-2" } },
          rect: { current: { translated: { left: 121, width: 20 } } },
        },
        over: { id: "entry-4", rect: { left: 100, width: 20 } },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith(
      "set-1",
      ["entry-1", "entry-3", "entry-4", "entry-2", "entry-5"],
    );
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("reorders entry forward to 7th position when dropping on right half of the 7th card", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController({
      entries: [
        { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
        { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
        { id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" },
        { id: "entry-4", sortIndex: 3, setId: "set-1", pairId: "pair-4" },
        { id: "entry-5", sortIndex: 4, setId: "set-1", pairId: "pair-5" },
        { id: "entry-6", sortIndex: 5, setId: "set-1", pairId: "pair-6" },
        { id: "entry-7", sortIndex: 6, setId: "set-1", pairId: "pair-7" },
      ],
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-3" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: {
          data: { current: { type: "entry", entryId: "entry-3" } },
          rect: { current: { translated: { left: 211, width: 20 } } },
        },
        over: { id: "entry-7", rect: { left: 190, width: 20 } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: {
          data: { current: { type: "entry", entryId: "entry-3" } },
          rect: { current: { translated: { left: 211, width: 20 } } },
        },
        over: { id: "entry-7", rect: { left: 190, width: 20 } },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith(
      "set-1",
      ["entry-1", "entry-2", "entry-4", "entry-5", "entry-6", "entry-7", "entry-3"],
    );
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("updates entry drop index when over target is unchanged but pointer context changes to right-half", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController({
      entries: [
        { id: "entry-1", sortIndex: 0, setId: "set-1", pairId: "pair-1" },
        { id: "entry-2", sortIndex: 1, setId: "set-1", pairId: "pair-2" },
        { id: "entry-3", sortIndex: 2, setId: "set-1", pairId: "pair-3" },
        { id: "entry-4", sortIndex: 3, setId: "set-1", pairId: "pair-4" },
      ],
    });

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
      } as never);

      // First hover commits with no pointer/rect context (defaults to before entry-3).
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "entry-3" },
      } as never);

      // Same overId, but now with right-half pointer context: should switch to after entry-3.
      result.current.dndHandlers.onDragOver({
        active: {
          data: { current: { type: "entry", entryId: "entry-1" } },
          rect: { current: { translated: { left: 131, width: 20 } } },
        },
        over: { id: "entry-3", rect: { left: 110, width: 20 } },
      } as never);

      await result.current.dndHandlers.onDragEnd({
        active: {
          data: { current: { type: "entry", entryId: "entry-1" } },
          rect: { current: { translated: { left: 131, width: 20 } } },
        },
        over: { id: "entry-3", rect: { left: 110, width: 20 } },
      } as never);
    });

    expect(reorderSetEntries).toHaveBeenCalledWith(
      "set-1",
      ["entry-2", "entry-3", "entry-1", "entry-4"],
    );
    expect(refreshSetEntries).toHaveBeenCalledWith("set-1");
  });

  it("ignores entry drop outside entries namespace", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
      } as never);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "entry", entryId: "entry-1" } } },
        over: { id: "group:group-1" },
      } as never);
    });

    expect(reorderSetEntries).not.toHaveBeenCalled();
    expect(refreshSetEntries).not.toHaveBeenCalled();
  });

  it("no-ops entry reorder when order does not change", async () => {
    const { result, reorderSetEntries, refreshSetEntries } = renderController();

    await act(async () => {
      result.current.dndHandlers.onDragStart({
        active: { data: { current: { type: "entry", entryId: "entry-2" } } },
      } as never);
      result.current.dndHandlers.onDragOver({
        active: { data: { current: { type: "entry", entryId: "entry-2" } } },
        over: { id: "entries-tail" },
      } as never);
      jest.advanceTimersByTime(60);
      await result.current.dndHandlers.onDragEnd({
        active: { data: { current: { type: "entry", entryId: "entry-2" } } },
        over: { id: "entries-tail" },
      } as never);
    });

    expect(reorderSetEntries).not.toHaveBeenCalled();
    expect(refreshSetEntries).not.toHaveBeenCalled();
  });
});
