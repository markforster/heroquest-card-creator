import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  addHeroBackLogoInputSchema,
  deleteHeroBackLogoRemediationSchema,
  heroBackLogoRecordSchema,
  heroBackLogoUsageRecordSchema,
} from "@/api/heroBackLogos/schema";

export const heroBackLogosApi = makeApi([
  {
    method: "get",
    path: "/hero-back-logos",
    alias: "listHeroBackLogos",
    response: z.array(heroBackLogoRecordSchema),
  },
  {
    method: "get",
    path: "/hero-back-logos/:id/object-url",
    alias: "getHeroBackLogoObjectUrl",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.string().nullable(),
  },
  {
    method: "get",
    path: "/hero-back-logos/:id/usage",
    alias: "getHeroBackLogoUsage",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.array(heroBackLogoUsageRecordSchema),
  },
  {
    method: "post",
    path: "/hero-back-logos",
    alias: "addHeroBackLogo",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: addHeroBackLogoInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "delete",
    path: "/hero-back-logos/:id",
    alias: "deleteHeroBackLogo",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "body",
        type: "Body",
        schema: deleteHeroBackLogoRemediationSchema,
      },
    ],
    response: z.array(z.string()),
  },
]);
