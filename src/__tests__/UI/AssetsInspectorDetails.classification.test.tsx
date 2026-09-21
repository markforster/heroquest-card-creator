import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { AssetRecord } from "@/api/assets";
import AssetsInspectorDetails from "@/components/Assets/AssetsInspectorDetails";
import { EscapeStackProvider, useEscapeModalAware } from "@/components/common/EscapeStackProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

const mockUpdate = jest.fn();
jest.mock("@/api/client", () => ({
  apiClient: { updateAssetMetadata: (...args: unknown[]) => mockUpdate(...args) },
}));
jest.mock("@/components/Providers/AssetKindBackfillProvider", () => ({
  useAssetKindQueue: () => ({ cancelAsset: jest.fn() }),
}));
const asset: AssetRecord = {
  id: "asset-1",
  name: "goblin.png",
  mimeType: "image/png",
  createdAt: 1,
  width: 100,
  height: 120,
  assetKindStatus: "classified",
  assetKind: "artwork",
};
const mockRouteEscape = jest.fn();
function RouteEscape() {
  useEscapeModalAware({ id: "route:assets", isOpen: true, onEscape: mockRouteEscape });
  return null;
}
function view(record = asset) {
  return (
    <I18nProvider>
      <EscapeStackProvider>
        <RouteEscape />
        <AssetsInspectorDetails
          asset={record}
          assetSizeBytes={100}
          usage={{ total: 0, cards: [] }}
          onOpenCard={() => undefined}
        />
      </EscapeStackProvider>
    </I18nProvider>
  );
}

describe("Asset inspector classification", () => {
  beforeEach(() => mockUpdate.mockReset());

  it("toggles, dismisses with Escape, and waits for persistence before closing", async () => {
    let finish!: () => void;
    mockUpdate.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    render(view());
    const trigger = screen.getByRole("button", { name: "Artwork" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(mockRouteEscape).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Icon" }));
    expect(mockUpdate).toHaveBeenCalledWith(
      {
        patch: expect.objectContaining({
          assetKind: "icon",
          assetKindSource: "manual",
          assetKindStatus: "classified",
        }),
      },
      { params: { id: asset.id } },
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await act(async () => finish());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("prevents editing while classifying and clears the menu when changing assets", () => {
    const { rerender } = render(view({ ...asset, assetKindStatus: "classifying" }));
    expect(screen.getByRole("button", { name: /Classifying/ })).toBeDisabled();
    rerender(view());
    fireEvent.click(screen.getByRole("button", { name: "Artwork" }));
    rerender(view({ ...asset, id: "asset-2" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
