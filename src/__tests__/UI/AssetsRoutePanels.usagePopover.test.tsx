import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import AssetsRoutePanels from "@/components/Assets/AssetsRoutePanels";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";
import type { CardRecord } from "@/api/cards";

const mockNavigate = jest.fn();
const mockSaveCurrentCard = jest.fn();
const mockRequestRecenter = jest.fn();
const mockUseFormState = jest.fn();
const mockListCards = jest.fn();
const mockGetCard = jest.fn();

const selectedAsset: AssetRecord = {
  id: "asset-1",
  name: "goblin.png",
  mimeType: "image/png",
  width: 100,
  height: 120,
  createdAt: 1,
};

function buildCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: "card-1",
    name: "Goblin",
    nameLower: "goblin",
    templateId: "monster",
    face: "front",
    title: "Goblin",
    body: "",
    imageAssetId: null,
    monsterIconAssetId: null,
    createdAt: 1,
    updatedAt: 1,
    status: "saved",
    deletedAt: null,
    thumbnailBlob: null,
    ...overrides,
  } as CardRecord;
}

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
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

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({
    isOpen,
    children,
    footer,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (isOpen ? <div>{children}{footer}</div> : null),
}));

jest.mock("@/components/Modals/ConfirmModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{children}</div>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    ) : null,
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
    saveCurrentCard: (...args: unknown[]) => mockSaveCurrentCard(...args),
  }),
}));

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    requestRecenter: (...args: unknown[]) => mockRequestRecenter(...args),
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
    getCard: (...args: unknown[]) => mockGetCard(...args),
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

describe("AssetsRoutePanels usage popover (UI)", () => {
  beforeEach(() => {
    mockUseFormState.mockReturnValue({ isDirty: false });
    mockSaveCurrentCard.mockResolvedValue(true);
    mockListCards.mockResolvedValue([]);
    mockGetCard.mockResolvedValue(null);
    mockNavigate.mockReset();
    mockRequestRecenter.mockReset();
    jest.useFakeTimers();
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("shows plain non-interactive text when no saved cards use the asset", async () => {
    renderSubject();

    await screen.findByText("Used on cards");
    await waitFor(() => {
      expect(screen.getByText((content) => content.replace(/\s+/g, " ").trim() === "0 Cards")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "0 Cards" })).not.toBeInTheDocument();
  });

  it("dedupes matching cards, opens the popover, and clamps it within the viewport", async () => {
    const first = buildCard({
      id: "card-1",
      updatedAt: 20,
      imageAssetId: "asset-1",
      monsterIconAssetId: "asset-1",
    });
    const second = buildCard({
      id: "card-2",
      name: "Orc",
      nameLower: "orc",
      updatedAt: 10,
      imageAssetId: "asset-1",
    });
    mockListCards.mockResolvedValue([second, first]);

    renderSubject();

    const trigger = await screen.findByRole("button", { name: "2 Cards" });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    trigger.getBoundingClientRect = () =>
      ({
        top: 300,
        left: 900,
        bottom: 320,
        right: 960,
        width: 60,
        height: 20,
        x: 900,
        y: 300,
        toJSON: () => ({}),
      }) as DOMRect;

    fireEvent.mouseEnter(trigger);

    const popover = await screen.findByRole("group", { name: "Used on cards" });
    expect(popover).toHaveStyle({ left: "776px", width: "232px" });
    expect(screen.getByRole("button", { name: "Goblin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Orc" })).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.getByRole("group", { name: "Used on cards" })).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(200);
    });
    await waitFor(() => {
      expect(screen.queryByRole("group", { name: "Used on cards" })).not.toBeInTheDocument();
    });
  });

  it("opens a linked card immediately when the editor is clean", async () => {
    mockListCards.mockResolvedValue([
      buildCard({
        id: "card-1",
        imageAssetId: "asset-1",
      }),
    ]);

    renderSubject();

    const trigger = await screen.findByRole("button", { name: "1 card" });
    fireEvent.focus(trigger);

    const linkedCardButton = await screen.findByRole("button", { name: "Goblin" });
    fireEvent.click(linkedCardButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/cards/card-1");
    });
  });

  it("prompts to save before opening a linked card when the editor is dirty", async () => {
    const targetCard = buildCard({
      id: "card-9",
      name: "Chaos Warrior",
      nameLower: "chaos warrior",
      imageAssetId: "asset-1",
    });
    mockUseFormState.mockReturnValue({ isDirty: true });
    mockListCards.mockResolvedValue([targetCard]);
    mockGetCard.mockResolvedValue(targetCard);

    renderSubject();

    const trigger = await screen.findByRole("button", { name: "1 card" });
    fireEvent.mouseEnter(trigger);

    const linkedCardButton = await screen.findByRole("button", { name: "Chaos Warrior" });
    fireEvent.click(linkedCardButton);

    expect(await screen.findByText("Save before viewing?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockSaveCurrentCard).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/cards/card-9");
    });
  });
});
