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
export const useListDecks = apiHooks.useListDecks.bind(apiHooks);
export const useGetDeck = apiHooks.useGetDeck.bind(apiHooks);
export const useCreateDeck = apiHooks.useCreateDeck.bind(apiHooks);
export const useUpdateDeck = apiHooks.useUpdateDeck.bind(apiHooks);
export const useDuplicateDeck = apiHooks.useDuplicateDeck.bind(apiHooks);
export const useDeleteDeck = apiHooks.useDeleteDeck.bind(apiHooks);
export const useListDeckGroups = apiHooks.useListDeckGroups.bind(apiHooks);
export const useCreateDeckGroup = apiHooks.useCreateDeckGroup.bind(apiHooks);
export const useUpdateDeckGroup = apiHooks.useUpdateDeckGroup.bind(apiHooks);
export const useReorderDeckGroups = apiHooks.useReorderDeckGroups.bind(apiHooks);
export const useDeleteDeckGroup = apiHooks.useDeleteDeckGroup.bind(apiHooks);
export const useListDeckSets = apiHooks.useListDeckSets.bind(apiHooks);
export const useCreateDeckSet = apiHooks.useCreateDeckSet.bind(apiHooks);
export const useUpdateDeckSet = apiHooks.useUpdateDeckSet.bind(apiHooks);
export const useReorderDeckSets = apiHooks.useReorderDeckSets.bind(apiHooks);
export const useRebuildDeckSetBack = apiHooks.useRebuildDeckSetBack.bind(apiHooks);
export const useDeleteDeckSet = apiHooks.useDeleteDeckSet.bind(apiHooks);
export const useListDeckEntries = apiHooks.useListDeckEntries.bind(apiHooks);
export const useAddDeckEntries = apiHooks.useAddDeckEntries.bind(apiHooks);
export const useRemoveDeckEntries = apiHooks.useRemoveDeckEntries.bind(apiHooks);
export const useReorderDeckEntries = apiHooks.useReorderDeckEntries.bind(apiHooks);
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
