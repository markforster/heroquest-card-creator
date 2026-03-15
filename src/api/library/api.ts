import { makeApi } from "@zodios/core";

import {
  libraryExportResultSchema,
  libraryImportInputSchema,
  libraryImportResultSchema,
} from "@/api/library/schema";

export const libraryApi = makeApi([
  {
    method: "get",
    path: "/library/export",
    alias: "exportLibrary",
    response: libraryExportResultSchema,
  },
  {
    method: "post",
    path: "/library/import",
    alias: "importLibrary",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: libraryImportInputSchema,
      },
    ],
    response: libraryImportResultSchema,
  },
]);
