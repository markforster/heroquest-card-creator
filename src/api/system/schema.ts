import { z } from "zod";

export const dbVersionCheckResponseSchema = z.object({
  status: z.enum(["ready", "blocked"]),
  dbVersion: z.number().nullable(),
  dbAppVersion: z.string().nullable(),
});
