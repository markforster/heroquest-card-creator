const runBulkExport = jest.fn();

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/ExportProgressOverlay", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Modals/ExportBleedPrompt", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/config/flags", () => ({ ENABLE_MISSING_ASSET_CHECKS: false }));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "en" }),
}));
jest.mock("@/components/Providers/ExportSettingsContext", () => ({
  useExportSettingsState: () => ({
    settings: {
      bleed: { enabled: true, bleedPx: 12, askBeforeExport: false },
      cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
      cutMarks: { enabled: false, color: "#00FFFF", style: "solid" },
      roundedCorners: true,
    },
  }),
  useExportProfilesState: () => ({ profiles: [], defaultProfile: null }),
}));
jest.mock("@/lib/export-cards", () => ({
  runBulkExport: (...args: unknown[]) => runBulkExport(...args),
}));

import { act, renderHook } from "@testing-library/react";

import { useBulkCardExport } from "@/components/Export/hooks/useBulkCardExport";

describe("useBulkCardExport", () => {
  beforeEach(() => {
    runBulkExport.mockReset();
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("cancels and alerts when there are no cards", async () => {
    const { result } = renderHook(() => useBulkCardExport());

    await expect(
      result.current.startBulkCardExport({
        cards: [],
        resolveName: jest.fn(),
        resolveZipName: jest.fn(),
      }),
    ).resolves.toEqual({ status: "cancelled" });
    expect(window.alert).toHaveBeenCalledWith("alert.selectCardToExport");
    expect(runBulkExport).not.toHaveBeenCalled();
  });

  it("delegates export settings and resets progress after completion", async () => {
    const exportResult = { status: "complete", exportedCount: 1 };
    runBulkExport.mockResolvedValue(exportResult);
    const resolveName = jest.fn();
    const resolveZipName = jest.fn();
    const { result } = renderHook(() => useBulkCardExport());

    let response: unknown;
    await act(async () => {
      response = await result.current.startBulkCardExport({
        cards: [{ id: "card-1", templateId: "hero", name: "Card" }] as never,
        resolveName,
        resolveZipName,
        skipPrecheck: true,
      });
    });

    expect(response).toEqual({ status: "completed", result: exportResult });
    expect(runBulkExport).toHaveBeenCalledWith(
      expect.objectContaining({
        resolveName,
        resolveZipName,
        bleedPx: 12,
        cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
        roundedCorners: true,
      }),
    );
    expect(result.current.isExporting).toBe(false);
  });

  it("converts export failures into a cancelled result", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    runBulkExport.mockRejectedValue(new Error("failed"));
    const { result } = renderHook(() => useBulkCardExport());

    let response: unknown;
    await act(async () => {
      response = await result.current.startBulkCardExport({
        cards: [{ id: "card-1", templateId: "hero", name: "Card" }] as never,
        resolveName: jest.fn(),
        resolveZipName: jest.fn(),
        skipPrecheck: true,
      });
    });

    expect(response).toEqual({ status: "cancelled" });
    expect(window.alert).toHaveBeenCalledWith("alert.exportImagesFailed");
    consoleError.mockRestore();
  });
});
