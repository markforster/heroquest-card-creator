import { makeApi } from "@zodios/core";

import {
  libraryExportQuerySchema,
  libraryExportResultSchema,
  libraryImportInputSchema,
  libraryImportResultSchema,
} from "@/api/library/schema";

export const libraryApi = makeApi([
  {
    method: "get",
    path: "/library/export",
    alias: "exportLibrary",
    parameters: [
      {
        name: "format",
        type: "Query",
        schema: libraryExportQuerySchema.shape.format,
      },
    ],
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
