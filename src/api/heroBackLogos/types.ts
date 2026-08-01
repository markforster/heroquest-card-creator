import {
  addHeroBackLogoInputSchema,
  deleteHeroBackLogoRemediationSchema,
  heroBackLogoModeSchema,
  heroBackLogoRecordSchema,
  heroBackLogoUsageRecordSchema,
} from "@/api/heroBackLogos/schema";

import type { z } from "zod";

export type HeroBackLogoMode = z.infer<typeof heroBackLogoModeSchema>;
export type HeroBackLogoRecord = z.infer<typeof heroBackLogoRecordSchema>;
export type AddHeroBackLogoInput = z.infer<typeof addHeroBackLogoInputSchema>;
export type DeleteHeroBackLogoRemediation = z.infer<typeof deleteHeroBackLogoRemediationSchema>;
export type HeroBackLogoUsageRecord = z.infer<typeof heroBackLogoUsageRecordSchema>;
