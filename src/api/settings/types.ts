import {
  borderSwatchesSchema,
  copyrightTemplateDefaultsSchema,
  defaultCopyrightSchema,
  setBorderSwatchesInputSchema,
  setCopyrightTemplateDefaultsInputSchema,
  setDefaultCopyrightInputSchema,
} from "@/api/settings/schema";

import type { z } from "zod";

export type BorderSwatches = z.infer<typeof borderSwatchesSchema>;
export type CopyrightTemplateDefaults = z.infer<typeof copyrightTemplateDefaultsSchema>;
export type DefaultCopyright = z.infer<typeof defaultCopyrightSchema>;
export type SetBorderSwatchesInput = z.infer<typeof setBorderSwatchesInputSchema>;
export type SetCopyrightTemplateDefaultsInput = z.infer<typeof setCopyrightTemplateDefaultsInputSchema>;
export type SetDefaultCopyrightInput = z.infer<typeof setDefaultCopyrightInputSchema>;
