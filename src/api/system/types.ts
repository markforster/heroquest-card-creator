import { z } from "zod";

import { dbVersionCheckResponseSchema } from "@/api/system/schema";

export type DbVersionCheckResponse = z.infer<typeof dbVersionCheckResponseSchema>;
