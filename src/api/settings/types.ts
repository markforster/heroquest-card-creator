import {
  borderSwatchesSchema,
  defaultCopyrightSchema,
  setBorderSwatchesInputSchema,
  setDefaultCopyrightInputSchema,
} from "@/api/settings/schema";

import type { z } from "zod";

export type BorderSwatches = z.infer<typeof borderSwatchesSchema>;
export type DefaultCopyright = z.infer<typeof defaultCopyrightSchema>;
export type SetBorderSwatchesInput = z.infer<typeof setBorderSwatchesInputSchema>;
export type SetDefaultCopyrightInput = z.infer<typeof setDefaultCopyrightInputSchema>;
