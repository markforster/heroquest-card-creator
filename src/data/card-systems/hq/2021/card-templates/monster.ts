import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import monsterThumbnail from "@/assets/template-thumbnails/monster.png";
import type { CardTemplateMeta } from "@/types/templates";

export const MONSTER_CARD_TEMPLATE: CardTemplateMeta = {
  id: "monster",
  name: "Monster Card",
  kind: "monster",
  description: "Monster card with stats and dedicated icon area.",
  thumbnail: monsterThumbnail,
  background: parchmentBackground,
  defaultFace: "front",
};
