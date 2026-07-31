import {
  collectionCreateInputSchema,
  collectionRecordSchema,
  collectionUpdateInputSchema,
} from "@/api/collections/schema";

import type { z } from "zod";

export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
export type CollectionCreateInput = z.infer<typeof collectionCreateInputSchema>;
export type CollectionUpdateInput = z.infer<typeof collectionUpdateInputSchema>;
