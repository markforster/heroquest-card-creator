import { act, renderHook } from "@testing-library/react";

import {
  TextFittingPreferencesProvider,
  useTextFittingPreferences,
} from "@/components/Providers/TextFittingPreferencesContext";

import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <TextFittingPreferencesProvider>{children}</TextFittingPreferencesProvider>
);

describe("TextFittingPreferencesProvider", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("updates, debounces, resets, and exposes dragging state", () => {
    const { result } = renderHook(() => useTextFittingPreferences(), { wrapper });

    act(() => {
      result.current.setRolePreferences("title", { minFontPercent: 80 });
      result.current.setRolePreferences("title", { minFontPercent: 70 });
      result.current.setIsDragging(true);
    });
    act(() => jest.advanceTimersByTime(150));

    expect(result.current.preferences.title.minFontPercent).toBe(70);
    expect(result.current.isDragging).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("hqcc.titleFittingPrefs") ?? "")).toMatchObject({
      minFontPercent: 70,
    });

    act(() => result.current.resetRolePreferences("title"));
    expect(result.current.preferences.title.minFontPercent).toBe(75);
  });
});
