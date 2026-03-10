import type { z } from "zod";

import {
  collectionCreateInputSchema,
  collectionRecordSchema,
  collectionUpdateInputSchema,
} from "@/api/collections/schema";

export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
export type CollectionCreateInput = z.infer<typeof collectionCreateInputSchema>;
export type CollectionUpdateInput = z.infer<typeof collectionUpdateInputSchema>;
