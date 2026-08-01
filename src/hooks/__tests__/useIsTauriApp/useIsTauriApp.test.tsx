const isTauri = jest.fn();

jest.mock("@tauri-apps/api/core", () => ({ isTauri: (...args: unknown[]) => isTauri(...args) }));

import { renderHook, waitFor } from "@testing-library/react";

import useIsTauriApp from "@/hooks/useIsTauriApp";

describe("useIsTauriApp", () => {
  beforeEach(() => isTauri.mockReset());

  it("reports the asynchronously detected Tauri state", async () => {
    isTauri.mockResolvedValue(true);
    const { result } = renderHook(() => useIsTauriApp());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("remains false when detection fails", async () => {
    isTauri.mockRejectedValue(new Error("unavailable"));
    const { result } = renderHook(() => useIsTauriApp());
    await waitFor(() => expect(isTauri).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
