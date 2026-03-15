"use client";

import { ZodiosHooks } from "@zodios/react";
import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import type { CardUpdateInput } from "@/api/cards";

export const apiHooks = new ZodiosHooks("hqcc", apiClient, {
  shouldAbortOnUnmount: true,
});

export const useListCards = apiHooks.useListCards.bind(apiHooks);
export const useCreateCard = apiHooks.useCreateCard.bind(apiHooks);
export const useDeleteCards = apiHooks.useDeleteCards.bind(apiHooks);
export const useSoftDeleteCards = apiHooks.useSoftDeleteCards.bind(apiHooks);
export const useRestoreCards = apiHooks.useRestoreCards.bind(apiHooks);
export const useDeleteCard = apiHooks.useDeleteCard.bind(apiHooks);
export const useGetCard = apiHooks.useGetCard.bind(apiHooks);
export const useGetCardThumbnail = apiHooks.useGetCardThumbnail.bind(apiHooks);
export const useUpdateCardThumbnail = apiHooks.useUpdateCardThumbnail.bind(apiHooks);
export const useListAssets = apiHooks.useListAssets.bind(apiHooks);
export const useListAssetsWithBlobs = apiHooks.useListAssetsWithBlobs.bind(apiHooks);
export const useGetAssetBlob = apiHooks.useGetAssetBlob.bind(apiHooks);
export const useGetAssetObjectUrl = apiHooks.useGetAssetObjectUrl.bind(apiHooks);
export const useAddAsset = apiHooks.useAddAsset.bind(apiHooks);
export const useReplaceAsset = apiHooks.useReplaceAsset.bind(apiHooks);
export const useUpdateAssetMetadata = apiHooks.useUpdateAssetMetadata.bind(apiHooks);
export const useResetAssetClassification = apiHooks.useResetAssetClassification.bind(apiHooks);
export const useResetAssetClassificationAll = apiHooks.useResetAssetClassificationAll.bind(apiHooks);
export const useDeleteAssets = apiHooks.useDeleteAssets.bind(apiHooks);
export const useTouchCardLastViewed = apiHooks.useTouchCardLastViewed.bind(apiHooks);
export const useUpdateCards = apiHooks.useUpdateCards.bind(apiHooks);
export const useNormalizeSelfPairings = apiHooks.useNormalizeSelfPairings.bind(apiHooks);
export const useListCollections = apiHooks.useListCollections.bind(apiHooks);
export const useGetCollection = apiHooks.useGetCollection.bind(apiHooks);
export const useCreateCollection = apiHooks.useCreateCollection.bind(apiHooks);
export const useUpdateCollection = apiHooks.useUpdateCollection.bind(apiHooks);
export const useDeleteCollection = apiHooks.useDeleteCollection.bind(apiHooks);
export const useExportLibrary = apiHooks.useExportLibrary.bind(apiHooks);
export const useImportLibrary = apiHooks.useImportLibrary.bind(apiHooks);
export const useGetBorderSwatches = apiHooks.useGetBorderSwatches.bind(apiHooks);
export const useSetBorderSwatches = apiHooks.useSetBorderSwatches.bind(apiHooks);
export const useGetDefaultCopyright = apiHooks.useGetDefaultCopyright.bind(apiHooks);
export const useSetDefaultCopyright = apiHooks.useSetDefaultCopyright.bind(apiHooks);
export const useListPairs = apiHooks.useListPairs.bind(apiHooks);
export const useCreatePair = apiHooks.useCreatePair.bind(apiHooks);
export const useDeletePair = apiHooks.useDeletePair.bind(apiHooks);

export function useUpdateCardMutation() {
  return useMutation({
    mutationFn: (args: { id: string; body: CardUpdateInput }) =>
      apiClient.updateCard(args.body, { params: { id: args.id } }),
  });
}
