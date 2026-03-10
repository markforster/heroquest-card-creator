import type { MessageKey } from "@/i18n/messages";
import type { AssetRecord } from "@/api/assets";

export type TranslateFn = (key: MessageKey) => string;

export const getAssetKindLabel = (t: TranslateFn, asset: AssetRecord) => {
  if (asset.assetKindStatus === "classified") {
    return asset.assetKind === "icon" ? t("label.assetKindIcon") : t("label.assetKindArtwork");
  }
  return t("label.assetKindFilterUnclassified");
};

export const makeFallbackAsset = (assetId: string, assetName: string): AssetRecord => ({
  id: assetId,
  name: assetName,
  mimeType: "image/*",
  width: 0,
  height: 0,
  createdAt: 0,
});

export type AddPinnedAssetArgs = {
  assetId?: string;
  assetName?: string;
  assetsById: Map<string, AssetRecord>;
  pinnedIds: Set<string>;
  pinnedAssets: AssetRecord[];
};

export const addPinnedAsset = ({
  assetId,
  assetName,
  assetsById,
  pinnedIds,
  pinnedAssets,
}: AddPinnedAssetArgs) => {
  if (!assetId || pinnedIds.has(assetId)) return;
  const asset = assetsById.get(assetId) ?? makeFallbackAsset(assetId, assetName ?? assetId);
  pinnedAssets.push(asset);
  pinnedIds.add(assetId);
};
