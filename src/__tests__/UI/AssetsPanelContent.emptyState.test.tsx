import { fireEvent, render, screen } from "@testing-library/react";

import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";

const mockUseListAssets = jest.fn();

jest.mock("@/api/hooks", () => ({
  useListAssets: (...args: unknown[]) => mockUseListAssets(...args),
}));

jest.mock("@/api/config", () => ({
  readApiConfig: () => ({ mode: "local" }),
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    getAssetObjectUrl: jest.fn().mockResolvedValue(null),
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
  getRemoteAssetThumbPrefetchEnabled: () => false,
  subscribeRemoteAssetFlags: () => () => undefined,
}));

function renderPanel() {
  return render(
    <I18nProvider>
      <AssetsPanelContent isOpen onClose={() => undefined} />
    </I18nProvider>,
  );
}

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

describe("AssetsPanelContent empty state (UI)", () => {
  beforeEach(() => {
    mockUseListAssets.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [] }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders onboarding content and external links when the asset library is empty", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Your asset library is empty" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "HeroQuest Card Creator does not ship with preloaded artwork. You can upload your own images, or start with Mark's free artwork pack.",
      ),
    ).toBeInTheDocument();

    const artworkLink = screen.getByRole("link", { name: "Download free artwork pack" });
    expect(artworkLink).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/download/v0.4.2/Artwork.zip",
    );
    expect(artworkLink).toHaveAttribute("target", "_blank");
    expect(artworkLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    expect(
      screen.getByText("After downloading the zip, add the artwork to your library in four quick steps:"),
    ).toBeInTheDocument();
    expect(screen.getByText("Download the Artwork.zip file to your computer.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Need more art?" })).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open Art Generator" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-67716ef315cc8191bc2b325feea57fb6-heroquest-character-art-generator",
    );
    expect(screen.getByRole("link", { name: "Open Card Art" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-676f12d691588191822f9fc1ed782d9a-heroquest-card-art",
    );
    expect(screen.getByRole("link", { name: "Open Icon Generator" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-6771661d7b8c81918a04a667f4d67531-heroquest-character-icons-v1",
    );
  });

  it("does not render onboarding when the library contains assets", () => {
    const asset = buildAsset();
    mockUseListAssets.mockReturnValue({
      data: [asset],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [asset] }),
    });

    renderPanel();

    expect(screen.queryByRole("heading", { name: "Your asset library is empty" })).not.toBeInTheDocument();
    expect(screen.getByText("goblin.png")).toBeInTheDocument();
  });

  it("shows the normal no-assets message for search-empty results when the library is not empty", () => {
    const asset = buildAsset();
    mockUseListAssets.mockReturnValue({
      data: [asset],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [asset] }),
    });

    renderPanel();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "wizard" },
    });

    expect(screen.getByText("No assets")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your asset library is empty" })).not.toBeInTheDocument();
  });

  it("renders the BookOpen resources menu and opens/closes with correct links", () => {
    const asset = buildAsset();
    mockUseListAssets.mockReturnValue({
      data: [asset],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [asset] }),
    });

    renderPanel();

    const resourcesButton = screen.getByTitle("Open artwork and GPT links");
    fireEvent.click(resourcesButton);

    expect(screen.getByRole("menu", { name: "Asset resources" })).toBeInTheDocument();

    const artworkLink = screen.getByRole("menuitem", { name: "Download free artwork pack" });
    expect(artworkLink).toHaveAttribute(
      "href",
      "https://github.com/markforster/heroquest-card-creator/releases/download/v0.4.2/Artwork.zip",
    );
    expect(artworkLink).toHaveAttribute("target", "_blank");
    expect(artworkLink).toHaveAttribute("rel", expect.stringContaining("noopener"));

    expect(screen.getByRole("menuitem", { name: "Open Art Generator" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-67716ef315cc8191bc2b325feea57fb6-heroquest-character-art-generator",
    );
    expect(screen.getByRole("menuitem", { name: "Open Card Art" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-676f12d691588191822f9fc1ed782d9a-heroquest-card-art",
    );
    expect(screen.getByRole("menuitem", { name: "Open Icon Generator" })).toHaveAttribute(
      "href",
      "https://chatgpt.com/g/g-6771661d7b8c81918a04a667f4d67531-heroquest-character-icons-v1",
    );

    fireEvent.click(artworkLink);
    expect(screen.queryByRole("menu", { name: "Asset resources" })).not.toBeInTheDocument();

    fireEvent.click(resourcesButton);
    expect(screen.getByRole("menu", { name: "Asset resources" })).toBeInTheDocument();
    fireEvent.click(resourcesButton);
    expect(screen.queryByRole("menu", { name: "Asset resources" })).not.toBeInTheDocument();
  });

  it("closes the resources menu on outside click", () => {
    const asset = buildAsset();
    mockUseListAssets.mockReturnValue({
      data: [asset],
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: [asset] }),
    });

    renderPanel();
    fireEvent.click(screen.getByTitle("Open artwork and GPT links"));
    expect(screen.getByRole("menu", { name: "Asset resources" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu", { name: "Asset resources" })).not.toBeInTheDocument();
  });
});
