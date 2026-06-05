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

function renderPanel({
  mode = "manage",
  onSelect,
  onClose,
}: {
  mode?: "manage" | "select";
  onSelect?: (asset: AssetRecord) => void;
  onClose?: () => void;
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
});
