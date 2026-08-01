const model = { rightPanelFaceMode: "front" };
const useDeckRightPanelModel = jest.fn(() => model);

jest.mock("@/components/Decks/hooks/useDeckRightPanelModel", () => ({
  useDeckRightPanelModel: (...args: unknown[]) => useDeckRightPanelModel(...args),
}));

import { renderHook } from "@testing-library/react";

import {
  DeckRightPanelProvider,
  useDeckRightPanel,
} from "@/components/Decks/detail/context/DeckRightPanelContext";

import type { ReactNode } from "react";

describe("DeckRightPanelContext", () => {
  it("builds and publishes the right panel model", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DeckRightPanelProvider>{children}</DeckRightPanelProvider>
    );

    expect(renderHook(() => useDeckRightPanel(), { wrapper }).result.current).toBe(model);
  });
});
