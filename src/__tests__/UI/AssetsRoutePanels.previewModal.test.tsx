import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AssetsRoutePanels from "@/components/Assets/AssetsRoutePanels";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";

const mockUseFormState = jest.fn();
const mockGetAssetObjectUrl = jest.fn();
const mockListCards = jest.fn();

const selectedAsset: AssetRecord = {
  id: "asset-1",
  name: "goblin.png",
  mimeType: "image/png",
  width: 100,
  height: 120,
  createdAt: 1,
};

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
    useEffect(() => {
      onSelectionChange?.([selectedAsset]);
    }, [onSelectionChange]);
    return <div>Assets Main Panel</div>;
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

    expect(await screen.findByText("No preview available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview: goblin" })).not.toBeInTheDocument();
  });
});
