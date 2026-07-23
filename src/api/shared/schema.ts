import { z } from "zod";

import type { StatAsteriskFlags } from "@/types/stats";

import type { StaticImageData } from "next/image";

export const templateIdSchema = z.enum([
  "hero",
  "monster",
  "large-treasure",
  "small-treasure",
  "rules",
  "hero-back",
  "logo-back",
  "labelled-back",
]);

export const cardFaceSchema = z.enum(["front", "back"]);

export const templateKindSchema = z.enum([
  "character",
  "monster",
  "treasure",
  "back",
  "custom",
  "other",
]);

export const statSplitFormatSchema = z.enum(["slash", "paren", "paren-leading"]);

export const statAsteriskFlagsSchema = z
  .array(z.boolean())
  .max(2)
  .transform((flags): StatAsteriskFlags => {
    if (flags.length === 0) return [];
    if (flags.length === 1) return [flags[0]];
    return [flags[0], flags[1]];
  });

export const statValueSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.union([z.literal(0), z.literal(1)])]),
  z.tuple([z.number(), z.number(), z.union([z.literal(0), z.literal(1)]), statSplitFormatSchema]),
]);

export const bodyTextStyleSchema = z
  .object({
    enabled: z.boolean().optional(),
    backdrop: z
      .object({
        enabled: z.boolean().optional(),
        color: z.string().optional(),
        opacity: z.number().optional(),
        insetMode: z.enum(["matchBorder", "flush"]).optional(),
        cornerMode: z.enum(["all", "opposite-title"]).optional(),
        fitMode: z.enum(["full", "fit-to-text"]).optional(),
      })
      .optional(),
  })
  .optional();

export const blobSchema = z.instanceof(Blob);

export const staticImageDataSchema = z.custom<StaticImageData>((value) => Boolean(value));

export const cardTemplateMetaSchema = z.object({
  id: templateIdSchema,
  name: z.string(),
  kind: templateKindSchema,
  description: z.string(),
  thumbnail: staticImageDataSchema,
  background: staticImageDataSchema,
  defaultFace: cardFaceSchema,
  isExperimental: z.boolean().optional(),
});
