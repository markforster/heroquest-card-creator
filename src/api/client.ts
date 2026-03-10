"use client";

import { Zodios } from "@zodios/core";
import axios from "axios";

import { api } from "@/api";
import { addAssetRequestPlugin } from "@/api/local/addAssetRequest";
import { checkDbVersionRequestPlugin } from "@/api/local/checkDbVersionRequest";
import { createCardRequestPlugin } from "@/api/local/createCardRequest";
import { createCollectionRequestPlugin } from "@/api/local/createCollectionRequest";
import { createPairRequestPlugin } from "@/api/local/createPairRequest";
import { deleteAssetsRequestPlugin } from "@/api/local/deleteAssetsRequest";
import { deleteCardRequestPlugin } from "@/api/local/deleteCardRequest";
import { deleteCardsRequestPlugin } from "@/api/local/deleteCardsRequest";
import { deleteCollectionRequestPlugin } from "@/api/local/deleteCollectionRequest";
import { deletePairRequestPlugin } from "@/api/local/deletePairRequest";
import { exportLibraryRequestPlugin } from "@/api/local/exportLibraryRequest";
import { getAssetBlobRequestPlugin } from "@/api/local/getAssetBlobRequest";
import { getAssetObjectUrlRequestPlugin } from "@/api/local/getAssetObjectUrlRequest";
import { getBorderSwatchesRequestPlugin } from "@/api/local/getBorderSwatchesRequest";
import { getCardRequestPlugin } from "@/api/local/getCardRequest";
import { getCollectionRequestPlugin } from "@/api/local/getCollectionRequest";
import { getDefaultCopyrightRequestPlugin } from "@/api/local/getDefaultCopyrightRequest";
import { importLibraryRequestPlugin } from "@/api/local/importLibraryRequest";
import { listAssetsRequestPlugin } from "@/api/local/listAssetsRequest";
import { listAssetsWithBlobsRequestPlugin } from "@/api/local/listAssetsWithBlobsRequest";
import { listCardsRequestPlugin } from "@/api/local/listCardsRequest";
import { listCollectionsRequestPlugin } from "@/api/local/listCollectionsRequest";
import { listPairsRequestPlugin } from "@/api/local/listPairsRequest";
import { normalizeSelfPairingsRequestPlugin } from "@/api/local/normalizeSelfPairingsRequest";
import { replaceAssetRequestPlugin } from "@/api/local/replaceAssetRequest";
import { resetAssetClassificationAllRequestPlugin } from "@/api/local/resetAssetClassificationAllRequest";
import { resetAssetClassificationRequestPlugin } from "@/api/local/resetAssetClassificationRequest";
import { restoreCardsRequestPlugin } from "@/api/local/restoreCardsRequest";
import { setBorderSwatchesRequestPlugin } from "@/api/local/setBorderSwatchesRequest";
import { setDefaultCopyrightRequestPlugin } from "@/api/local/setDefaultCopyrightRequest";
import { softDeleteCardsRequestPlugin } from "@/api/local/softDeleteCardsRequest";
import { touchCardLastViewedRequestPlugin } from "@/api/local/touchCardLastViewedRequest";
import { updateAssetMetadataRequestPlugin } from "@/api/local/updateAssetMetadataRequest";
import { updateCardRequestPlugin } from "@/api/local/updateCardRequest";
import { updateCardsRequestPlugin } from "@/api/local/updateCardsRequest";
import { updateCardThumbnailRequestPlugin } from "@/api/local/updateCardThumbnailRequest";
import { updateCollectionRequestPlugin } from "@/api/local/updateCollectionRequest";

const axiosInstance = axios.create({
  baseURL: "/",
});

export const apiClient = new Zodios(api, {
  axiosInstance,
});

apiClient.use("listCards", listCardsRequestPlugin);
apiClient.use("getCard", getCardRequestPlugin);
apiClient.use("createCard", createCardRequestPlugin);
apiClient.use("updateCard", updateCardRequestPlugin);
apiClient.use("updateCardThumbnail", updateCardThumbnailRequestPlugin);
apiClient.use("deleteCard", deleteCardRequestPlugin);
apiClient.use("deleteCards", deleteCardsRequestPlugin);
apiClient.use("softDeleteCards", softDeleteCardsRequestPlugin);
apiClient.use("restoreCards", restoreCardsRequestPlugin);
apiClient.use("touchCardLastViewed", touchCardLastViewedRequestPlugin);
apiClient.use("updateCards", updateCardsRequestPlugin);
apiClient.use("normalizeSelfPairings", normalizeSelfPairingsRequestPlugin);

apiClient.use("listAssets", listAssetsRequestPlugin);
apiClient.use("listAssetsWithBlobs", listAssetsWithBlobsRequestPlugin);
apiClient.use("getAssetBlob", getAssetBlobRequestPlugin);
apiClient.use("getAssetObjectUrl", getAssetObjectUrlRequestPlugin);
apiClient.use("addAsset", addAssetRequestPlugin);
apiClient.use("replaceAsset", replaceAssetRequestPlugin);
apiClient.use("updateAssetMetadata", updateAssetMetadataRequestPlugin);
apiClient.use("resetAssetClassification", resetAssetClassificationRequestPlugin);
apiClient.use("resetAssetClassificationAll", resetAssetClassificationAllRequestPlugin);
apiClient.use("deleteAssets", deleteAssetsRequestPlugin);

apiClient.use("listCollections", listCollectionsRequestPlugin);
apiClient.use("getCollection", getCollectionRequestPlugin);
apiClient.use("createCollection", createCollectionRequestPlugin);
apiClient.use("updateCollection", updateCollectionRequestPlugin);
apiClient.use("deleteCollection", deleteCollectionRequestPlugin);

apiClient.use("listPairs", listPairsRequestPlugin);
apiClient.use("createPair", createPairRequestPlugin);
apiClient.use("deletePair", deletePairRequestPlugin);

apiClient.use("exportLibrary", exportLibraryRequestPlugin);
apiClient.use("importLibrary", importLibraryRequestPlugin);

apiClient.use("getBorderSwatches", getBorderSwatchesRequestPlugin);
apiClient.use("setBorderSwatches", setBorderSwatchesRequestPlugin);
apiClient.use("getDefaultCopyright", getDefaultCopyrightRequestPlugin);
apiClient.use("setDefaultCopyright", setDefaultCopyrightRequestPlugin);

apiClient.use("checkDbVersion", checkDbVersionRequestPlugin);
