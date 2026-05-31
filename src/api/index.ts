import { makeApi } from "@zodios/core";

import { assetsApi } from "@/api/assets";
import { cardsApi } from "@/api/cards";
import { collectionsApi } from "@/api/collections";
import { decksApi } from "@/api/decks";
import { libraryApi } from "@/api/library";
import { pairsApi } from "@/api/pairs";
import { settingsApi } from "@/api/settings";
import { systemApi } from "@/api/system";

export const api = makeApi([
  ...cardsApi,
  ...assetsApi,
  ...collectionsApi,
  ...decksApi,
  ...libraryApi,
  ...pairsApi,
  ...settingsApi,
  ...systemApi,
]);

export {
  assetsApi,
  cardsApi,
  collectionsApi,
  decksApi,
  libraryApi,
  pairsApi,
  settingsApi,
  systemApi,
};
