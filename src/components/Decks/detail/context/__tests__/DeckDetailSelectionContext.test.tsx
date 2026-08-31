import { renderHook } from "@testing-library/react";

import {
  DeckDetailSelectionProvider,
  useDeckDetailSelection,
} from "@/components/Decks/detail/context/DeckDetailSelectionContext";
import type { DeckDetailSelectionModel } from "@/components/Decks/hooks/useDeckDetailSelectionModel";

import type { ReactNode } from "react";

describe("DeckDetailSelectionContext", () => {
  it("returns the supplied selection model", () => {
    const model = { selectedDeckId: "deck-1" } as unknown as DeckDetailSelectionModel;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DeckDetailSelectionProvider model={model}>{children}</DeckDetailSelectionProvider>
    );

    expect(renderHook(() => useDeckDetailSelection(), { wrapper }).result.current).toBe(model);
  });
});
