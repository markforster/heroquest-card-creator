const setStoredValue = jest.fn();
const useLocalStorageBoolean = jest.fn((key: unknown, defaultValue: unknown) => {
  void key;
  void defaultValue;
  return [true, setStoredValue];
});

jest.mock("@/components/Providers/LocalStorageProvider", () => ({
  useLocalStorageBoolean: (key: unknown, defaultValue: unknown) =>
    useLocalStorageBoolean(key, defaultValue),
}));

import { renderHook } from "@testing-library/react";

import { DebugVisualsProvider, useDebugVisuals } from "@/components/Providers/DebugVisualsContext";

import type { ReactNode } from "react";

describe("DebugVisualsProvider", () => {
  it("publishes the persisted text-bounds setting", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DebugVisualsProvider>{children}</DebugVisualsProvider>
    );
    const { result } = renderHook(() => useDebugVisuals(), { wrapper });

    expect(useLocalStorageBoolean).toHaveBeenCalledWith("hqcc.debugTextBounds", false);
    expect(result.current).toEqual({ showTextBounds: true, setShowTextBounds: setStoredValue });
  });
});
