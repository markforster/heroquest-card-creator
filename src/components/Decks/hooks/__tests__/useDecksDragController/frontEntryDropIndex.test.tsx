import { act, renderHook } from "@testing-library/react";

import { useDecksDragController } from "@/components/Decks/hooks/useDecksDragController";

describe("useDecksDragController front/entry drop index targeting", () => {
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
