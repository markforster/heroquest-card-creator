import { act, renderHook } from "@testing-library/react";

import {
  EscapeStackProvider,
  useEscapeStack,
  useOptionalEscapeStack,
} from "@/components/common/EscapeStackProvider";

describe("EscapeStackProvider hooks", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EscapeStackProvider>{children}</EscapeStackProvider>
  );

  it("exposes stack controls and handles the most recently registered entry", () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result } = renderHook(() => useEscapeStack(), { wrapper });

    act(() => {
      result.current.register("first", first, true);
      result.current.register("second", second, true);
    });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("returns null from the optional hook outside a provider", () => {
    const { result } = renderHook(() => useOptionalEscapeStack());

    expect(result.current).toBeNull();
  });

  it("rejects required hook usage outside a provider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useEscapeStack())).toThrow(
      "useEscapeStack must be used within EscapeStackProvider",
    );

    consoleError.mockRestore();
  });
});
