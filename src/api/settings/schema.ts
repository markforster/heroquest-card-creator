import { z } from "zod";
import { TEMPLATE_IDS } from "@/types/templates";

export const borderSwatchesSchema = z.array(z.string());
export const defaultCopyrightSchema = z.string();
export const copyrightTemplateDefaultsSchema = z
  .object(
    Object.fromEntries(TEMPLATE_IDS.map((templateId) => [templateId, z.boolean().optional()])) as Record<
      string,
      z.ZodOptional<z.ZodBoolean>
    >,
  )
  .partial();

export const setBorderSwatchesInputSchema = z.object({
  swatches: borderSwatchesSchema,
});

export const setDefaultCopyrightInputSchema = z.object({
  value: defaultCopyrightSchema,
});

export const setCopyrightTemplateDefaultsInputSchema = z.object({
  value: copyrightTemplateDefaultsSchema,
});
