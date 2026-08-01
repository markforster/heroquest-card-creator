import { z } from "zod";

import { blobSchema } from "@/api/shared/schema";

export const heroBackLogoModeSchema = z.enum(["default", "none", "custom"]);

export const heroBackLogoRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const addHeroBackLogoInputSchema = z.object({
  id: z.string(),
  blob: blobSchema,
  name: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const deleteHeroBackLogoRemediationSchema = z.union([
  z.object({
    mode: z.literal("default"),
  }),
  z.object({
    mode: z.literal("none"),
  }),
  z.object({
    mode: z.literal("custom"),
    logoId: z.string(),
    logoName: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
]);

export const heroBackLogoUsageRecordSchema = z.object({
  cardId: z.string(),
  name: z.string(),
  logoMode: heroBackLogoModeSchema,
});
