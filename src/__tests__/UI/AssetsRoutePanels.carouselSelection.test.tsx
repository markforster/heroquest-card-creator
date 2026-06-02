import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AssetsRoutePanels from "@/components/Assets/AssetsRoutePanels";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";

const mockUseFormState = jest.fn();
const mockListCards = jest.fn();

const selectedAssets: AssetRecord[] = [
  {
    id: "asset-1",
    name: "goblin.png",
    mimeType: "image/png",
    width: 100,
    height: 120,
    createdAt: 1,
  },
  {
    id: "asset-2",
    name: "orc.png",
    mimeType: "image/png",
    width: 140,
    height: 160,
    createdAt: 2,
  },
];

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
      onSelectionChange?.(selectedAssets.map((asset) => ({ ...asset })));
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
    getAssetObjectUrl: jest.fn().mockResolvedValue(null),
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

describe("AssetsRoutePanels carousel selection (UI)", () => {
  beforeEach(() => {
    mockUseFormState.mockReturnValue({ isDirty: false });
    mockListCards.mockResolvedValue([]);
    emitSelectionRefresh = null;
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

  it("keeps the active carousel item when the same selected asset ids are re-emitted", async () => {
    renderSubject();

    expect(await screen.findByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("2 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh selection" }));

    await waitFor(() => {
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });
  });
});
