import { renderHook } from "@testing-library/react";

import {
  DeckSetEntriesProvider,
  useDeckSetEntries,
} from "@/components/Decks/detail/context/DeckSetEntriesContext";
import type { DeckSetEntriesModel } from "@/components/Decks/hooks/useDeckSetEntriesModel";

import type { ReactNode } from "react";

describe("DeckSetEntriesContext", () => {
  it("returns the supplied entries model", () => {
    const model = { entries: [] } as unknown as DeckSetEntriesModel;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DeckSetEntriesProvider model={model}>{children}</DeckSetEntriesProvider>
    );

    expect(renderHook(() => useDeckSetEntries(), { wrapper }).result.current).toBe(model);
  });
});
