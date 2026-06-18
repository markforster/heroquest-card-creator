import type { CardTemplateMeta } from "@/types/templates";

import { HERO_BACK_CARD_TEMPLATE } from "./hero-back";
import { HERO_CARD_TEMPLATE } from "./hero";
import { LABELLED_BACK_CARD_TEMPLATE } from "./labelled-back";
import { LARGE_TREASURE_CARD_TEMPLATE } from "./large-treasure";
import { MONSTER_CARD_TEMPLATE } from "./monster";
import { SMALL_TREASURE_CARD_TEMPLATE } from "./small-treasure";

export {
  HERO_BACK_CARD_TEMPLATE,
  HERO_CARD_TEMPLATE,
  LABELLED_BACK_CARD_TEMPLATE,
  LARGE_TREASURE_CARD_TEMPLATE,
  MONSTER_CARD_TEMPLATE,
  SMALL_TREASURE_CARD_TEMPLATE,
};

export const cardTemplates: CardTemplateMeta[] = [
  HERO_CARD_TEMPLATE,
  MONSTER_CARD_TEMPLATE,
  SMALL_TREASURE_CARD_TEMPLATE,
  LARGE_TREASURE_CARD_TEMPLATE,
  HERO_BACK_CARD_TEMPLATE,
  LABELLED_BACK_CARD_TEMPLATE,
];

export const cardTemplatesById: Record<string, CardTemplateMeta> = Object.fromEntries(
  cardTemplates.map((tpl) => [tpl.id, tpl]),
);
