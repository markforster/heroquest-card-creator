import { z } from "zod";

import {
  libraryExportQuerySchema,
  libraryExportResultSchema,
  libraryImportInputSchema,
  libraryImportResultSchema,
} from "@/api/library/schema";

export type LibraryExportQuery = z.infer<typeof libraryExportQuerySchema>;
export type LibraryImportInput = z.infer<typeof libraryImportInputSchema>;
export type LibraryExportResult = z.infer<typeof libraryExportResultSchema>;
export type LibraryImportResult = z.infer<typeof libraryImportResultSchema>;
