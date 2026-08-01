import { act, renderHook } from "@testing-library/react";

import { useDeckDetailState } from "@/components/Decks/hooks/useDeckDetailState";

describe("useDeckDetailState", () => {
  it("tracks delete and rebuild modal state independently", () => {
    const { result } = renderHook(() => useDeckDetailState("deck-1"));
    const group = { id: "group-1" } as never;
    const set = { id: "set-1" } as never;

    act(() => {
      result.current.setIsDeleteDeckOpen(true);
      result.current.setIsDeleteSetOpen(true);
      result.current.setIsDeleteGroupOpen(true);
      result.current.setPendingDeleteGroup(group);
      result.current.setPendingDeleteSet(set);
      result.current.setIsRebuildConfirmOpen(true);
      result.current.setPendingRebuildSetId("set-1");
    });

    expect(result.current).toMatchObject({
      isDeleteDeckOpen: true,
      isDeleteSetOpen: true,
      isDeleteGroupOpen: true,
      pendingDeleteGroup: group,
      pendingDeleteSet: set,
      isRebuildConfirmOpen: true,
      pendingRebuildSetId: "set-1",
    });
  });
});
