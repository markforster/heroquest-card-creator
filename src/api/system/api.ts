import { makeApi } from "@zodios/core";

import { dbVersionCheckResponseSchema } from "@/api/system/schema";

export const systemApi = makeApi([
  {
    method: "get",
    path: "/system/db-version",
    alias: "checkDbVersion",
    response: dbVersionCheckResponseSchema,
  },
]);
