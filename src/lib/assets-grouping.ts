"use client";

import type { MessageKey } from "@/i18n/messages";
import type { AssetRecord } from "@/lib/assets-db";

export type AssetKindGroupId = "artwork" | "icon" | "unclassified";

export const DEFAULT_ASSET_GROUP_ORDER: AssetKindGroupId[] = [
  "artwork",
  "icon",
  "unclassified",
];

const GROUP_LABELS: Record<AssetKindGroupId, MessageKey> = {
  artwork: "label.assetKindFilterArtwork",
  icon: "label.assetKindFilterIcon",
  unclassified: "label.assetKindFilterUnclassified",
};

export function getAssetKindGroup(asset: AssetRecord): AssetKindGroupId {
  if (asset.assetKindStatus === "classified") {
    if (asset.assetKind === "icon") return "icon";
    if (asset.assetKind === "artwork") return "artwork";
  }
  return "unclassified";
}

function normalizePreferredOrder(
  preferredKindOrder?: AssetKindGroupId[],
): AssetKindGroupId[] {
  if (!preferredKindOrder || preferredKindOrder.length === 0) return [];
  const seen = new Set<AssetKindGroupId>();
  const normalized: AssetKindGroupId[] = [];
  preferredKindOrder.forEach((id) => {
    if (id === "unclassified") return;
    if (!DEFAULT_ASSET_GROUP_ORDER.includes(id)) return;
    if (seen.has(id)) return;
    seen.add(id);
    normalized.push(id);
  });
  return normalized;
}

function getGroupOrder(preferredKindOrder?: AssetKindGroupId[]): AssetKindGroupId[] {
  const order: AssetKindGroupId[] = [];
  const preferred = normalizePreferredOrder(preferredKindOrder);
  preferred.forEach((id) => order.push(id));
  DEFAULT_ASSET_GROUP_ORDER.forEach((id) => {
    if (id === "unclassified") return;
    if (!order.includes(id)) {
      order.push(id);
    }
  });
  if (!order.includes("unclassified")) {
    order.push("unclassified");
  }
  return order;
}

function compareAssets(a: AssetRecord, b: AssetRecord): number {
  const aName = (a as AssetRecord & { nameLower?: string }).nameLower ?? a.name;
  const bName = (b as AssetRecord & { nameLower?: string }).nameLower ?? b.name;
  const nameCompare = aName.toLowerCase().localeCompare(bName.toLowerCase());
  if (nameCompare !== 0) return nameCompare;

  if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;

  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  if (bArea !== aArea) return bArea - aArea;

  const mimeCompare = a.mimeType.localeCompare(b.mimeType);
  if (mimeCompare !== 0) return mimeCompare;

  return a.id.localeCompare(b.id);
}

export function groupAssetsByKind(
  assets: AssetRecord[],
  preferredKindOrder?: AssetKindGroupId[],
): Array<{ id: AssetKindGroupId; labelKey: MessageKey; assets: AssetRecord[] }> {
  const order = getGroupOrder(preferredKindOrder);
  const grouped = new Map<AssetKindGroupId, AssetRecord[]>(
    order.map((id) => [id, []]),
  );

  assets.forEach((asset) => {
    const groupId = getAssetKindGroup(asset);
    const bucket = grouped.get(groupId);
    if (bucket) {
      bucket.push(asset);
    } else {
      grouped.set(groupId, [asset]);
    }
  });

  return order.map((id) => ({
    id,
    labelKey: GROUP_LABELS[id],
    assets: (grouped.get(id) ?? []).slice().sort(compareAssets),
  }));
}
