import type { InspectorFieldsByTemplate } from "@/types/inspector";

import { HERO_BACK_INSPECTOR_FIELDS } from "./hero-back";
import { HERO_INSPECTOR_FIELDS } from "./hero";
import { LABELLED_BACK_INSPECTOR_FIELDS } from "./labelled-back";
import { LARGE_TREASURE_INSPECTOR_FIELDS } from "./large-treasure";
import { MONSTER_INSPECTOR_FIELDS } from "./monster";
import { SMALL_TREASURE_INSPECTOR_FIELDS } from "./small-treasure";

export {
  HERO_BACK_INSPECTOR_FIELDS,
  HERO_INSPECTOR_FIELDS,
  LABELLED_BACK_INSPECTOR_FIELDS,
  LARGE_TREASURE_INSPECTOR_FIELDS,
  MONSTER_INSPECTOR_FIELDS,
  SMALL_TREASURE_INSPECTOR_FIELDS,
};

export const inspectorFieldsByTemplate: InspectorFieldsByTemplate = {
  hero: HERO_INSPECTOR_FIELDS,
  monster: MONSTER_INSPECTOR_FIELDS,
  "small-treasure": SMALL_TREASURE_INSPECTOR_FIELDS,
  "large-treasure": LARGE_TREASURE_INSPECTOR_FIELDS,
  "hero-back": HERO_BACK_INSPECTOR_FIELDS,
  "labelled-back": LABELLED_BACK_INSPECTOR_FIELDS,
};
