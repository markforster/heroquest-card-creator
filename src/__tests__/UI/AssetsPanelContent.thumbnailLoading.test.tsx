import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import styles from "@/app/page.module.css";
import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";

const mockUseListAssets = jest.fn();
const mockGetAssetObjectUrl = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListAssets: (...args: unknown[]) => mockUseListAssets(...args),
}));

jest.mock("@/api/config", () => ({
  readApiConfig: () => ({ mode: "local" }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getAssetObjectUrl: (...args: unknown[]) => mockGetAssetObjectUrl(...args),
    deleteAssets: jest.fn(),
    listAssets: jest.fn().mockResolvedValue([]),
    listCards: jest.fn().mockResolvedValue([]),
    updateCard: jest.fn(),
    addAsset: jest.fn(),
    updateAssetMetadata: jest.fn(),
  },
}));

jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  useMissingAssets: () => ({
    runMissingAssetsScan: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/AssetKindBackfillProvider", () => ({
  useAssetKindQueue: () => ({
    enqueueAsset: jest.fn(),
    cancelAsset: jest.fn(),
    setIsActive: jest.fn(),
  }),
}));

jest.mock("@/hooks/useAssetHashIndex", () => ({
  useAssetHashIndex: () => ({
    scanFiles: jest.fn(),
    addToIndex: jest.fn(),
    removeFromIndex: jest.fn(),
    existingNames: new Set<string>(),
  }),
}));

jest.mock("@/lib/remote-asset-flags", () => ({
  getRemoteAssetThumbPrefetchEnabled: () => true,
  subscribeRemoteAssetFlags: () => () => undefined,
}));

function buildAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "asset-1",
    name: "goblin.png",
    mimeType: "image/png",
    width: 100,
    height: 120,
    createdAt: 1,
    ...overrides,
  };
}

function renderPanel() {
  function Wrapper() {
    const methods = useForm();
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <AssetsPanelContent isOpen onClose={() => undefined} />
        </FormProvider>
      </I18nProvider>
    );
  }

  return render(<Wrapper />);
}

describe("AssetsPanelContent thumbnail loading (UI)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.dataset.theme = "dark";
    const asset = buildAsset();
    mockUseListAssets.mockReturnValue({
      data: [asset],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [asset] }),
    });
    mockGetAssetObjectUrl.mockResolvedValue("blob:asset-thumb");
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    document.documentElement.dataset.theme = "dark";
  });

  it("renders the unknown asset-kind badge on the tile in light theme", async () => {
    document.documentElement.dataset.theme = "light";

    renderPanel();

    const badge = await screen.findByText("Unknown");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass(styles.assetsKindBadgeUnknown);
    expect(badge).toHaveClass(styles.assetsKindBadgeTile);
  });

  it("does not flash a spinner for a thumbnail that finishes before the delay", async () => {
    let resolveThumbUrl!: (value: string | null) => void;
    mockGetAssetObjectUrl.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveThumbUrl = resolve;
        }),
    );
    const { container } = renderPanel();

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(container.getElementsByClassName("assetsThumbSpinnerOverlay")).toHaveLength(0);

    resolveThumbUrl("blob:asset-thumb");
    const image = await screen.findByAltText("goblin.png");
    fireEvent.load(image);

    act(() => {
      jest.advanceTimersByTime(49);
    });
    await waitFor(() => {
      expect(container.getElementsByClassName("assetsThumbSpinnerOverlay")).toHaveLength(0);
    });
  });

  it("shows a delayed spinner and keeps it visible for the minimum duration", async () => {
    let resolveThumbUrl!: (value: string | null) => void;
    mockGetAssetObjectUrl.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveThumbUrl = resolve;
        }),
    );
    const { container } = renderPanel();

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(container.getElementsByClassName("assetsThumbSpinnerOverlay")).toHaveLength(1);

    resolveThumbUrl("blob:asset-thumb");
    await act(async () => {
      await Promise.resolve();
    });
    const image = screen.getByAltText("goblin.png");
    fireEvent.load(image);

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(container.getElementsByClassName("assetsThumbSpinnerOverlay")).toHaveLength(1);

    await waitFor(() => {
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(container.getElementsByClassName("assetsThumbSpinnerOverlay")).toHaveLength(0);
    });
  });
});
