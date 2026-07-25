import { makeApi } from "@zodios/core";
import { z } from "zod";

import {
  borderSwatchesSchema,
  copyrightTemplateDefaultsSchema,
  defaultCopyrightSchema,
  setBorderSwatchesInputSchema,
  setCopyrightTemplateDefaultsInputSchema,
  setDefaultCopyrightInputSchema,
} from "@/api/settings/schema";

export const settingsApi = makeApi([
  {
    method: "get",
    path: "/settings/border-swatches",
    alias: "getBorderSwatches",
    response: borderSwatchesSchema,
  },
  {
    method: "put",
    path: "/settings/border-swatches",
    alias: "setBorderSwatches",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: setBorderSwatchesInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/settings/default-copyright",
    alias: "getDefaultCopyright",
    response: defaultCopyrightSchema,
  },
  {
    method: "put",
    path: "/settings/default-copyright",
    alias: "setDefaultCopyright",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: setDefaultCopyrightInputSchema,
      },
    ],
    response: z.void(),
  },
  {
    method: "get",
    path: "/settings/copyright-template-defaults",
    alias: "getCopyrightTemplateDefaults",
    response: copyrightTemplateDefaultsSchema,
  },
  {
    method: "put",
    path: "/settings/copyright-template-defaults",
    alias: "setCopyrightTemplateDefaults",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: setCopyrightTemplateDefaultsInputSchema,
      },
    ],
    response: z.void(),
  },
]);
