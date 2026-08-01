import { act, renderHook, waitFor } from "@testing-library/react";

import {
  useWebglPreviewSettings,
  WebglPreviewSettingsProvider,
} from "@/components/Providers/WebglPreviewSettingsContext";

import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <WebglPreviewSettingsProvider>{children}</WebglPreviewSettingsProvider>;
}

describe("WebglPreviewSettingsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it("hydrates saved values and persists updates", async () => {
    window.localStorage.setItem(
      "hqcc.webglPreviewSettings",
      JSON.stringify({ sheenAngle: 0.2, sheenIntensity: 0.8 }),
    );
    const { result } = renderHook(() => useWebglPreviewSettings(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.sheenAngle).toBe(0.2);
      expect(result.current.sheenIntensity).toBe(0.8);
    });

    act(() => {
      result.current.setSheenAngle(0.7);
      result.current.setSheenIntensity(1.4);
    });

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("hqcc.webglPreviewSettings") ?? "")).toEqual({
        sheenAngle: 0.7,
        sheenIntensity: 1.4,
      });
    });
  });

  it("keeps defaults for malformed or incorrectly typed stored values", () => {
    window.localStorage.setItem(
      "hqcc.webglPreviewSettings",
      JSON.stringify({ sheenAngle: "invalid", sheenIntensity: null }),
    );

    const { result } = renderHook(() => useWebglPreviewSettings(), { wrapper: Wrapper });

    expect(result.current.sheenAngle).toBe(0.45);
    expect(result.current.sheenIntensity).toBe(1.1);
  });

  it("tolerates storage read and write failures", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(() => renderHook(() => useWebglPreviewSettings(), { wrapper: Wrapper })).not.toThrow();
  });
});
