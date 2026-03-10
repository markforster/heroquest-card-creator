import {
  blobSchema,
  bodyTextStyleSchema,
  cardFaceSchema,
  cardTemplateMetaSchema,
  statSplitFormatSchema,
  statValueSchema,
  templateKindSchema,
  templateIdSchema,
} from "@/api/shared/schema";

import type { z } from "zod";

export type TemplateId = z.infer<typeof templateIdSchema>;
export type TemplateKind = z.infer<typeof templateKindSchema>;
export type CardFace = z.infer<typeof cardFaceSchema>;
export type StatSplitFormat = z.infer<typeof statSplitFormatSchema>;
export type StatValue = z.infer<typeof statValueSchema>;
export type BlobLike = z.infer<typeof blobSchema>;
export type BodyTextStyle = z.infer<typeof bodyTextStyleSchema>;
export type CardTemplateMeta = z.infer<typeof cardTemplateMetaSchema>;
