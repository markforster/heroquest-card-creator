import { act, renderHook } from "@testing-library/react";

import { FooterTipProvider, useFooterTip } from "@/components/Providers/FooterTipContext";

import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <FooterTipProvider>{children}</FooterTipProvider>
);

describe("FooterTipProvider", () => {
  it("sets, replaces, and source-safely clears the current tip", () => {
    const { result } = renderHook(() => useFooterTip(), { wrapper });

    act(() => result.current.setTip("editor", "Choose a card", "lightbulb"));
    expect(result.current.currentTip).toEqual({
      source: "editor",
      message: "Choose a card",
      icon: "lightbulb",
    });

    act(() => result.current.clearTip("other"));
    expect(result.current.currentTip?.source).toBe("editor");

    act(() => result.current.clearTip("editor"));
    expect(result.current.currentTip).toBeNull();
  });
});
