import { z } from "zod";

export const borderSwatchesSchema = z.array(z.string());
export const defaultCopyrightSchema = z.string();

export const setBorderSwatchesInputSchema = z.object({
  swatches: borderSwatchesSchema,
});

export const setDefaultCopyrightInputSchema = z.object({
  value: defaultCopyrightSchema,
});
