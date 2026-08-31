const exportFaceIdsToZip = jest.fn();
const track = jest.fn();

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/common/CardThumbnail", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/ExportProgressOverlay", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Modals/ExportBleedPrompt", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  useAnalytics: () => ({ track }),
}));
jest.mock("@/components/Providers/ExportSettingsContext", () => ({
  useExportSettingsState: () => ({
    settings: {
      bleed: { enabled: false, bleedPx: 12, askBeforeExport: false },
      cropMarks: { enabled: true, color: "#00FFFF", style: "lines" },
      cutMarks: { enabled: false, color: "#00FFFF", style: "solid" },
      roundedCorners: true,
    },
  }),
  useExportProfilesState: () => ({ profiles: [], defaultProfile: null }),
}));
jest.mock("@/config/flags", () => ({ ENABLE_MISSING_ASSET_CHECKS: false }));
jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "en" }),
}));
jest.mock("@/lib/export-face-ids", () => ({
  exportFaceIdsToZip: (...args: unknown[]) => exportFaceIdsToZip(...args),
}));

import { act, renderHook, waitFor } from "@testing-library/react";

import { useCardExportController } from "@/components/App/pages/cards/CardExportController";

describe("useCardExportController", () => {
  beforeEach(() => {
    exportFaceIdsToZip.mockReset().mockResolvedValue({ status: "complete", exportedCount: 2 });
    track.mockReset();
  });

  it("does not offer paired export actions without an effective face", () => {
    const { result } = renderHook(() =>
      useCardExportController({
        effectiveFace: null,
        pairedBackId: null,
        pairedFrontCount: 0,
        pairedFrontIds: [],
        activeFrontId: null,
        previewRef: { current: null },
      }),
    );

    expect(result.current.exportMenuItems).toEqual([]);
  });

  it("exports a front and its paired back through the shared ZIP helper", async () => {
    const { result } = renderHook(() =>
      useCardExportController({
        activeCardId: "front-1",
        effectiveFace: "front",
        pairedBackId: "back-1",
        pairedFrontCount: 0,
        pairedFrontIds: [],
        activeFrontId: null,
        previewRef: { current: null },
      }),
    );

    expect(result.current.exportMenuItems).toHaveLength(1);
    act(() => result.current.exportMenuItems[0]?.onClick());

    await waitFor(() => expect(exportFaceIdsToZip).toHaveBeenCalled());
    expect(exportFaceIdsToZip).toHaveBeenCalledWith(
      ["front-1", "back-1"],
      expect.objectContaining({ bleedPx: 0, roundedCorners: true }),
    );
    expect(track).toHaveBeenCalledWith("export_started", { scope: "editor_multi" });
  });

  it("falls back to the preview export when no persisted card is active", async () => {
    const exportAsPng = jest.fn();
    const { result } = renderHook(() =>
      useCardExportController({
        effectiveFace: "front",
        pairedBackId: null,
        pairedFrontCount: 0,
        pairedFrontIds: [],
        activeFrontId: null,
        previewRef: { current: { exportAsPng } } as never,
      }),
    );

    act(() => result.current.onExportPng());

    await waitFor(() => expect(exportAsPng).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith("export_started", { scope: "editor_single" });
  });
});
