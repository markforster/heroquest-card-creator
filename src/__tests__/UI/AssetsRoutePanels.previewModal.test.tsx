import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import AssetsRoutePanels from "@/components/Assets/AssetsRoutePanels";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";

const mockUseFormState = jest.fn();
const mockGetAssetObjectUrl = jest.fn();
const mockListCards = jest.fn();

const firstSelectedAsset: AssetRecord = {
  id: "asset-1",
  name: "goblin.png",
  mimeType: "image/png",
  width: 100,
  height: 120,
  createdAt: 1,
};

const secondSelectedAsset: AssetRecord = {
  id: "asset-2",
  name: "orc.png",
  mimeType: "image/png",
  width: 140,
  height: 160,
  createdAt: 2,
};

let selectedAsset: AssetRecord = { ...firstSelectedAsset };
let emitSelectionRefresh: (() => void) | null = null;

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("react-hook-form", () => ({
  useFormState: () => mockUseFormState(),
}));

jest.mock("@/components/Assets/AssetsMainPanel", () => ({
  __esModule: true,
  default: ({ onSelectionChange }: { onSelectionChange?: (assets: AssetRecord[]) => void }) => {
    const { useEffect } = require("react");
    emitSelectionRefresh = () => {
      onSelectionChange?.([{ ...selectedAsset }]);
    };
    useEffect(() => {
      emitSelectionRefresh?.();
    }, [onSelectionChange]);
    return (
      <button type="button" onClick={() => emitSelectionRefresh?.()}>
        Refresh selection
      </button>
    );
  },
}));

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Stockpile/StockpileThumbImage", () => ({
  __esModule: true,
  default: ({ alt = "" }: { alt?: string }) => <img alt={alt} src="thumb.png" />,
}));

jest.mock("@/components/Providers/AssetKindBackfillProvider", () => ({
  useAssetKindQueue: () => ({
    enqueueAsset: jest.fn(),
    cancelAsset: jest.fn(),
    setIsActive: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "monster",
    },
  }),
}));

jest.mock("@/components/Providers/EditorSaveContext", () => ({
  useEditorSave: () => ({
    saveCurrentCard: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    requestRecenter: jest.fn(),
  }),
}));

jest.mock("@/components/common/usePopoverPlacement", () => ({
  usePopoverPlacement: () => null,
}));

jest.mock("@/hooks/useOutsideClick", () => ({
  useOutsideClick: jest.fn(),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getAssetObjectUrl: (...args: unknown[]) => mockGetAssetObjectUrl(...args),
    getAssetBlob: jest.fn().mockResolvedValue(null),
    listCards: (...args: unknown[]) => mockListCards(...args),
    getCard: jest.fn().mockResolvedValue(null),
    replaceAsset: jest.fn(),
    updateAssetMetadata: jest.fn(),
    addAsset: jest.fn(),
  },
}));

function renderSubject() {
  return render(
    <I18nProvider>
      <AssetsRoutePanels />
    </I18nProvider>,
  );
}

describe("AssetsRoutePanels preview modal (UI)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    selectedAsset = { ...firstSelectedAsset };
    emitSelectionRefresh = null;
    mockUseFormState.mockReturnValue({ isDirty: false });
    mockGetAssetObjectUrl.mockResolvedValue("blob:asset-preview");
    mockListCards.mockResolvedValue([]);
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("opens the zoom modal from the inspector preview and reuses the loaded preview url", async () => {
    const { container } = renderSubject();

    const trigger = await screen.findByRole("button", { name: "Preview: goblin" });
    expect(trigger).toHaveClass("assetsInspectorPreviewButtonInteractive");

    fireEvent.click(trigger);

    expect(await screen.findByText("Preview: goblin")).toBeInTheDocument();
    expect(screen.getAllByAltText("goblin.png")).toHaveLength(2);
    expect(mockGetAssetObjectUrl).toHaveBeenCalledTimes(1);
    expect(container.getElementsByClassName("assetsPreviewModalPopover")).toHaveLength(1);
  });

  it("closes the zoom modal on Escape", async () => {
    renderSubject();

    const trigger = await screen.findByRole("button", { name: "Preview: goblin" });
    fireEvent.click(trigger);
    await screen.findByText("Preview: goblin");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Preview: goblin")).not.toBeInTheDocument();
    });
  });

  it("shows the shared empty preview state when no preview url is available", async () => {
    mockGetAssetObjectUrl.mockResolvedValue(null);

    renderSubject();

    await waitFor(() => {
      expect(screen.queryByText("No preview available")).toBeInTheDocument();
    });
    expect(await screen.findByText("No preview available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview: goblin" })).not.toBeInTheDocument();
  });

  it("shows a spinner until the selected preview image finishes loading", async () => {
    let resolvePreviewUrl!: (value: string | null) => void;
    mockGetAssetObjectUrl.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePreviewUrl = resolve;
        }),
    );
    const { container } = renderSubject();

    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(1);

    resolvePreviewUrl("blob:asset-preview");
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Preview: goblin" })).toBeInTheDocument();
    const image = screen.getByAltText("goblin.png");
    fireEvent.load(image);

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(1);

    await waitFor(() => {
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    });
  });

  it("clears the spinner if the selected preview image errors", async () => {
    const { container } = renderSubject();

    const image = await screen.findByAltText("goblin.png");
    act(() => {
      jest.advanceTimersByTime(150);
    });
    fireEvent.error(image);

    await waitFor(() => {
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    });
  });

  it("does not flash a spinner for a preview that resolves before the delay", async () => {
    let resolvePreviewUrl!: (value: string | null) => void;
    mockGetAssetObjectUrl.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePreviewUrl = resolve;
        }),
    );
    const { container } = renderSubject();

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);

    resolvePreviewUrl("blob:asset-preview");
    const image = await screen.findByAltText("goblin.png");
    fireEvent.load(image);
    act(() => {
      jest.advanceTimersByTime(49);
    });
    await waitFor(() => {
      expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    });
  });

  it("clears the old preview immediately when the selected asset changes", async () => {
    let resolveSecondPreview!: (value: string | null) => void;
    mockGetAssetObjectUrl
      .mockResolvedValueOnce("blob:goblin-preview")
      .mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveSecondPreview = resolve;
          }),
      );
    const { container } = renderSubject();

    const firstImage = await screen.findByAltText("goblin.png");
    fireEvent.load(firstImage);
    await waitFor(() => {
      expect(screen.queryByAltText("goblin.png")).toBeInTheDocument();
    });

    selectedAsset = { ...secondSelectedAsset };
    fireEvent.click(screen.getByRole("button", { name: "Refresh selection" }));

    await waitFor(() => {
      expect(screen.queryByAltText("goblin.png")).not.toBeInTheDocument();
    });
    expect(screen.getByText("orc")).toBeInTheDocument();
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(1);

    resolveSecondPreview("blob:orc-preview");

    const secondImage = await screen.findByAltText("orc.png");
    fireEvent.load(secondImage);
    await waitFor(() => {
      expect(screen.queryByAltText("orc.png")).toBeInTheDocument();
    });
  });

  it("shows a spinner instead of the empty state while the next preview is still being fetched", async () => {
    let resolveSecondPreview!: (value: string | null) => void;
    mockGetAssetObjectUrl
      .mockResolvedValueOnce("blob:goblin-preview")
      .mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveSecondPreview = resolve;
          }),
      );
    const { container } = renderSubject();

    const firstImage = await screen.findByAltText("goblin.png");
    fireEvent.load(firstImage);
    await waitFor(() => {
      expect(screen.queryByAltText("goblin.png")).toBeInTheDocument();
    });

    selectedAsset = { ...secondSelectedAsset };
    fireEvent.click(screen.getByRole("button", { name: "Refresh selection" }));

    await waitFor(() => {
      expect(screen.queryByAltText("goblin.png")).not.toBeInTheDocument();
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(container.getElementsByClassName("assetsInspectorPreviewSpinnerOverlay")).toHaveLength(1);
    expect(screen.queryByText("No preview available")).not.toBeInTheDocument();

    resolveSecondPreview(null);

    await waitFor(() => {
      expect(screen.getByText("No preview available")).toBeInTheDocument();
    });
  });
});
