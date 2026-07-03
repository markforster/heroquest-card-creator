import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import AssetsPanelContent from "@/components/Assets/AssetsPanelContent";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { AssetRecord } from "@/api/assets";
import type { UploadScanReport } from "@/types/asset-duplicates";

const mockUseListAssets = jest.fn();
const mockAddAsset = jest.fn();
const mockUpdateAssetMetadata = jest.fn();
const mockListAssets = jest.fn();
const mockScanFiles = jest.fn();
const mockGenerateId = jest.fn();
const mockGetImageDimensions = jest.fn();

let assetStore: AssetRecord[] = [];
let createdAtCounter = 10;
let existingNamesStore = new Set<string>();

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
    listAssets: (...args: unknown[]) => mockListAssets(...args),
    listCards: jest.fn().mockResolvedValue([]),
    updateCard: jest.fn(),
    addAsset: (...args: unknown[]) => mockAddAsset(...args),
    updateAssetMetadata: (...args: unknown[]) => mockUpdateAssetMetadata(...args),
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
    scanFiles: (...args: unknown[]) => mockScanFiles(...args),
    addToIndex: jest.fn(),
    removeFromIndex: jest.fn(),
    existingNames: existingNamesStore,
  }),
}));

jest.mock("@/lib/remote-asset-flags", () => ({
  getRemoteAssetThumbPrefetchEnabled: () => false,
  subscribeRemoteAssetFlags: () => () => undefined,
}));

jest.mock("@/components/Assets/getImageDimensions", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockGetImageDimensions(...args),
}));

jest.mock("@/lib", () => ({
  generateId: (...args: unknown[]) => mockGenerateId(...args),
}));

function buildAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "asset-1",
    name: "existing-art.png",
    mimeType: "image/png",
    width: 100,
    height: 120,
    createdAt: 1,
    assetKindStatus: "classified",
    assetKind: "artwork",
    ...overrides,
  };
}

function buildScanReport(files: File[]): UploadScanReport {
  return {
    items: files.map((file, index) => ({
      file,
      fileIndex: index,
      hash: `hash-${index}`,
      status: "unique" as const,
      recommendedAction: "keep" as const,
    })),
  };
}

function buildAssetSeries(names: string[]): AssetRecord[] {
  return names.map((name, index) =>
    buildAsset({
      id: `asset-${index + 1}`,
      name: `${name}.png`,
      createdAt: index + 1,
    }),
  );
}

function renderPanel({
  mode = "manage",
  onSelect,
  onClose,
  initialSelectedAssetId,
}: {
  mode?: "manage" | "select";
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
  initialSelectedAssetId?: string;
} = {}) {
  function Wrapper() {
    const methods = useForm();
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <AssetsPanelContent
            isOpen
            onClose={onClose ?? (() => undefined)}
            mode={mode}
            onSelect={onSelect}
            initialSelectedAssetId={initialSelectedAssetId}
          />
        </FormProvider>
      </I18nProvider>
    );
  }

  return render(<Wrapper />);
}

function getGroupSection(name: string) {
  return screen.getByRole("heading", { name }).closest("section");
}

async function uploadFiles(container: HTMLElement, files: File[]) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
  expect(input).toBeTruthy();
  await act(async () => {
    fireEvent.change(input as HTMLInputElement, { target: { files } });
  });
}

function getAssetTile(container: HTMLElement, title: string) {
  const button = Array.from(container.querySelectorAll("button[title]")).find(
    (element) => element.getAttribute("title") === title,
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function getSelectedAssetTitles(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button.assetsItemSelected[title]"))
    .map((element) => element.getAttribute("title"))
    .filter((title): title is string => Boolean(title))
    .sort();
}

function SelectPanelHarness({ initialSelectedAssetId }: { initialSelectedAssetId: string }) {
  const methods = useForm();
  return (
    <I18nProvider>
      <FormProvider {...methods}>
        <AssetsPanelContent
          isOpen
          onClose={() => undefined}
          mode="select"
          initialSelectedAssetId={initialSelectedAssetId}
        />
      </FormProvider>
    </I18nProvider>
  );
}

function renderWithSelectPanel(initialSelectedAssetId: string) {
  return render(<SelectPanelHarness initialSelectedAssetId={initialSelectedAssetId} />);
}

describe("AssetsPanelContent recent uploads (UI)", () => {
  beforeEach(() => {
    assetStore = [buildAsset()];
    createdAtCounter = 10;
    existingNamesStore = new Set(assetStore.map((asset) => asset.name));

    mockUseListAssets.mockImplementation(() => ({
      data: assetStore,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue({ data: assetStore }),
    }));
    mockListAssets.mockImplementation(async () => assetStore);
    mockGetImageDimensions.mockResolvedValue({ width: 320, height: 240 });
    mockGenerateId.mockImplementation(() => `generated-${createdAtCounter++}`);
    mockScanFiles.mockImplementation(async (files: File[], onProgress?: (completed: number, total: number) => void) => {
      onProgress?.(files.length, files.length);
      return buildScanReport(files);
    });
    mockAddAsset.mockImplementation(async (payload: {
      id: string;
      name: string;
      mimeType: string;
      width: number;
      height: number;
    }) => {
      assetStore = [
        ...assetStore,
        {
          id: payload.id,
          name: payload.name,
          mimeType: payload.mimeType,
          width: payload.width,
          height: payload.height,
          createdAt: createdAtCounter++,
        },
      ];
      existingNamesStore.add(payload.name);
    });
    mockUpdateAssetMetadata.mockImplementation(async ({ patch }: { patch: Partial<AssetRecord> }, options: { params: { id: string } }) => {
      assetStore = assetStore.map((asset) =>
        asset.id === options.params.id ? { ...asset, ...patch } : asset,
      );
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the most recent upload batch as a top group, dedupes lower groups, and scrolls it into view", async () => {
    const { container } = renderPanel();
    const file = new File(["goblin"], "goblin-new.png", { type: "image/png" });

    await uploadFiles(container, [file]);

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(screen.getByText("goblin-new")).toBeInTheDocument();
    expect(screen.getAllByText("goblin-new")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Artwork" })).toBeInTheDocument();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("replaces the previous recent batch when a new upload batch succeeds", async () => {
    const { container } = renderPanel();

    await uploadFiles(container, [new File(["goblin"], "goblin-new.png", { type: "image/png" })]);
    expect(await screen.findByText("goblin-new")).toBeInTheDocument();

    await uploadFiles(container, [new File(["wizard"], "wizard-new.png", { type: "image/png" })]);

    const recentSection = await waitFor(() => {
      const section = getGroupSection("Recently uploaded");
      expect(section).toBeTruthy();
      return section as HTMLElement;
    });

    expect(within(recentSection).getByText("wizard-new")).toBeInTheDocument();
    expect(within(recentSection).queryByText("goblin-new")).not.toBeInTheDocument();
    expect(screen.getAllByText("goblin-new")).toHaveLength(1);
  });

  it("keeps the recent group visible under artwork filtering and still applies search and MIME filtering", async () => {
    const { container } = renderPanel();
    const jpgFile = new File(["goblin"], "goblin-photo.jpg", { type: "image/jpeg" });

    await uploadFiles(container, [jpgFile]);
    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Filter assets"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Artwork/i }));

    expect(screen.getByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(screen.getByText("goblin-photo")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "wizard" } });
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Recently uploaded" })).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "goblin" } });
    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Filter assets by type"));
    const mimeMenu = screen.getByRole("menu");
    fireEvent.click(within(mimeMenu).getByRole("menuitem", { name: /image\/jpeg/i }));
    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Filter assets by type"));
    fireEvent.click(screen.getByRole("menuitem", { name: /image\/png/i }));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Recently uploaded" })).not.toBeInTheDocument();
    });
  });

  it("clears the recent group when the panel remounts", async () => {
    const { container, unmount } = renderPanel();

    await uploadFiles(container, [new File(["goblin"], "goblin-new.png", { type: "image/png" })]);
    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();

    unmount();

    renderPanel();
    expect(screen.queryByRole("heading", { name: "Recently uploaded" })).not.toBeInTheDocument();
    expect(screen.getByText("goblin-new")).toBeInTheDocument();
  });

  it("shows renamed uploads in the recent group after review continues", async () => {
    const { container } = renderPanel();
    existingNamesStore.add("goblin-new.png");

    await uploadFiles(container, [new File(["goblin"], "goblin-new.png", { type: "image/png" })]);

    expect(await screen.findByText("goblin-new (2).png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(screen.getByText("goblin-new (2)")).toBeInTheDocument();
    expect(screen.getAllByText("goblin-new (2)")).toHaveLength(1);
  });

  it("preselects a single successful upload in select mode without auto-confirming", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { container } = renderPanel({ mode: "select", onSelect, onClose });

    await uploadFiles(container, [new File(["goblin"], "goblin-new.png", { type: "image/png" })]);

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    const selectButton = screen.getByRole("button", { name: "Select" });
    expect(selectButton).toBeEnabled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "goblin-new.png",
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("does not preselect when multiple assets are uploaded in select mode", async () => {
    const onSelect = jest.fn();
    const { container } = renderPanel({ mode: "select", onSelect });

    await uploadFiles(container, [
      new File(["goblin"], "goblin-new.png", { type: "image/png" }),
      new File(["wizard"], "wizard-new.png", { type: "image/png" }),
    ]);

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("preselects the current asset on open and scrolls to it immediately in select mode", async () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie"]);
    renderPanel({ mode: "select", initialSelectedAssetId: "asset-2" });

    const selectButton = await screen.findByRole("button", { name: "Select" });
    expect(selectButton).toBeEnabled();
    expect(getSelectedAssetTitles(document.body)).toEqual(["bravo"]);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "nearest",
    });
  });

  it("keeps the selected asset visible under search and kind filters in select mode", async () => {
    assetStore = [
      buildAsset({
        id: "asset-1",
        name: "alpha-art.png",
        assetKind: "artwork",
        assetKindStatus: "classified",
      }),
      buildAsset({
        id: "asset-2",
        name: "hidden-icon.png",
        assetKind: "icon",
        assetKindStatus: "classified",
      }),
      buildAsset({
        id: "asset-3",
        name: "beta-art.png",
        assetKind: "artwork",
        assetKindStatus: "classified",
      }),
    ];

    const { container } = renderPanel({ mode: "select", initialSelectedAssetId: "asset-2" });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "beta" } });
    fireEvent.click(screen.getByTitle("Filter assets"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Artwork/i }));

    expect(getSelectedAssetTitles(container)).toEqual(["hidden-icon"]);
    expect(screen.getByText("hidden-icon")).toBeInTheDocument();
    expect(screen.getAllByText("hidden-icon")).toHaveLength(1);
    expect(screen.getByText("beta-art")).toBeInTheDocument();
  });

  it("stops pinning the previous asset after selecting a different asset in select mode", async () => {
    assetStore = [
      buildAsset({
        id: "asset-1",
        name: "alpha-art.png",
        assetKind: "artwork",
        assetKindStatus: "classified",
      }),
      buildAsset({
        id: "asset-2",
        name: "hidden-icon.png",
        assetKind: "icon",
        assetKindStatus: "classified",
      }),
      buildAsset({
        id: "asset-3",
        name: "beta-art.png",
        assetKind: "artwork",
        assetKindStatus: "classified",
      }),
    ];

    const { container } = renderPanel({ mode: "select", initialSelectedAssetId: "asset-2" });

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "beta" } });
    fireEvent.click(screen.getByTitle("Filter assets"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Artwork/i }));
    fireEvent.click(getAssetTile(container, "beta-art"));

    expect(getSelectedAssetTitles(container)).toEqual(["beta-art"]);
    expect(screen.queryByText("hidden-icon")).not.toBeInTheDocument();
  });

  it("does not seed selection when the initial asset id is missing", async () => {
    assetStore = buildAssetSeries(["alpha", "bravo"]);
    renderPanel({ mode: "select", initialSelectedAssetId: "missing-asset" });

    const selectButton = await screen.findByRole("button", { name: "Select" });
    expect(selectButton).toBeDisabled();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalledWith({
      behavior: "auto",
      block: "nearest",
    });
  });

  it("waits for the first asset load to settle before applying the initial seed", async () => {
    assetStore = buildAssetSeries(["alpha", "bravo"]);
    const queryRefetch = jest.fn().mockResolvedValue({ data: assetStore });
    let queryState: { data: AssetRecord[] | undefined; isLoading: boolean } = {
      data: undefined,
      isLoading: true,
    };

    mockUseListAssets.mockImplementation(() => ({
      ...queryState,
      refetch: queryRefetch,
    }));

    const { rerender } = renderWithSelectPanel("asset-2");

    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
    expect(getSelectedAssetTitles(document.body)).toEqual([]);

    queryState = {
      data: assetStore,
      isLoading: false,
    };

    rerender(<SelectPanelHarness initialSelectedAssetId="asset-2" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select" })).toBeEnabled();
    });
    expect(getSelectedAssetTitles(document.body)).toEqual(["bravo"]);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "nearest",
    });
  });

  it("keeps a single-upload auto-select authoritative when initial seeding resolves later", async () => {
    assetStore = [buildAsset({ id: "asset-1", name: "existing-art.png" })];
    const queryRefetch = jest.fn().mockResolvedValue({ data: assetStore });
    let queryState: { data: AssetRecord[] | undefined; isLoading: boolean } = {
      data: undefined,
      isLoading: true,
    };

    mockUseListAssets.mockImplementation(() => ({
      ...queryState,
      refetch: queryRefetch,
    }));

    const { container, rerender } = renderWithSelectPanel("asset-1");

    await uploadFiles(container, [new File(["goblin"], "goblin-new.png", { type: "image/png" })]);

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(getSelectedAssetTitles(container)).toEqual(["goblin-new"]);

    queryState = {
      data: assetStore,
      isLoading: false,
    };

    rerender(<SelectPanelHarness initialSelectedAssetId="asset-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select" })).toBeEnabled();
    });
    expect(getSelectedAssetTitles(container)).toEqual(["goblin-new"]);
    expect(getSelectedAssetTitles(container)).not.toContain("existing-art");
  });

  it("omits duplicate-skipped and failed uploads from the recent group", async () => {
    const { container } = renderPanel();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const duplicateFile = new File(["existing"], "existing-art.png", { type: "image/png" });
    const brokenFile = new File(["broken"], "broken-upload.png", { type: "image/png" });
    const goodFile = new File(["fresh"], "fresh-upload.png", { type: "image/png" });

    mockScanFiles.mockResolvedValueOnce({
      items: [
        {
          file: duplicateFile,
          fileIndex: 0,
          hash: "hash-duplicate",
          status: "duplicate-existing" as const,
          recommendedAction: "skip" as const,
        },
        {
          file: brokenFile,
          fileIndex: 1,
          hash: "hash-broken",
          status: "unique" as const,
          recommendedAction: "keep" as const,
        },
        {
          file: goodFile,
          fileIndex: 2,
          hash: "hash-good",
          status: "unique" as const,
          recommendedAction: "keep" as const,
        },
      ],
    });
    mockAddAsset.mockImplementationOnce(async () => {
      throw new Error("upload failed");
    });

    await uploadFiles(container, [duplicateFile, brokenFile, goodFile]);

    expect(await screen.findByText("existing-art.png")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();
    expect(screen.getByText("fresh-upload")).toBeInTheDocument();
    expect(screen.queryByText("broken-upload")).not.toBeInTheDocument();
    expect(screen.getAllByText("existing-art")).toHaveLength(1);
    expect(screen.getAllByText("fresh-upload")).toHaveLength(1);
    consoleErrorSpy.mockRestore();
  });

  it("adds a visible shift range after a plain click anchor in manage mode", () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie", "delta"]);
    const { container } = renderPanel();

    fireEvent.click(getAssetTile(container, "alpha"));
    fireEvent.click(getAssetTile(container, "charlie"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual(["alpha", "bravo", "charlie"]);
    expect(screen.getByRole("button", { name: "Delete (3)" })).toBeEnabled();
  });

  it("treats shift click without an anchor like a plain click in manage mode", () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie"]);
    const { container } = renderPanel();

    fireEvent.click(getAssetTile(container, "charlie"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual(["charlie"]);
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("updates the anchor on cmd ctrl click and additively selects the next shift range", () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie", "delta"]);
    const { container } = renderPanel();

    fireEvent.click(getAssetTile(container, "alpha"));
    fireEvent.click(getAssetTile(container, "charlie"), { metaKey: true });
    fireEvent.click(getAssetTile(container, "delta"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual(["alpha", "charlie", "delta"]);
    expect(screen.getByRole("button", { name: "Delete (3)" })).toBeEnabled();
  });

  it("supports additive mixed click, shift, and cmd ctrl selection sequences", () => {
    assetStore = buildAssetSeries([
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
      "india",
      "juliet",
      "kilo",
      "lima",
    ]);
    const { container } = renderPanel();

    fireEvent.click(getAssetTile(container, "alpha"));
    fireEvent.click(getAssetTile(container, "echo"), { shiftKey: true });
    fireEvent.click(getAssetTile(container, "hotel"), { metaKey: true });
    fireEvent.click(getAssetTile(container, "lima"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual([
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "hotel",
      "india",
      "juliet",
      "kilo",
      "lima",
    ]);
    expect(screen.getByRole("button", { name: "Delete (10)" })).toBeEnabled();
  });

  it("supports reverse-direction shift ranges and avoids duplicate ids across overlaps", () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie", "delta", "echo"]);
    const { container } = renderPanel();

    fireEvent.click(getAssetTile(container, "echo"));
    fireEvent.click(getAssetTile(container, "bravo"), { shiftKey: true });
    fireEvent.click(getAssetTile(container, "delta"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual([
      "bravo",
      "charlie",
      "delta",
      "echo",
    ]);
    expect(screen.getByRole("button", { name: "Delete (4)" })).toBeEnabled();
  });

  it("keeps select mode single-select even when shift is used", () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie"]);
    const { container } = renderPanel({ mode: "select", onSelect: jest.fn() });

    fireEvent.click(getAssetTile(container, "alpha"));
    fireEvent.click(getAssetTile(container, "charlie"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual(["charlie"]);
    expect(screen.getByRole("button", { name: "Select" })).toBeEnabled();
  });

  it("computes shift range from the visible order including recently uploaded first", async () => {
    assetStore = buildAssetSeries(["alpha", "bravo", "charlie"]);
    const { container } = renderPanel();

    await uploadFiles(container, [new File(["fresh"], "fresh-upload.png", { type: "image/png" })]);
    expect(await screen.findByRole("heading", { name: "Recently uploaded" })).toBeInTheDocument();

    fireEvent.click(getAssetTile(container, "fresh-upload"));
    fireEvent.click(getAssetTile(container, "bravo"), { shiftKey: true });

    expect(getSelectedAssetTitles(container)).toEqual([
      "alpha",
      "bravo",
      "fresh-upload",
    ]);
    expect(screen.getByRole("button", { name: "Delete (3)" })).toBeEnabled();
  });
});
