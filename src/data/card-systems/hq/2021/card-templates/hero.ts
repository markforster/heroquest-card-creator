import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import heroThumbnail from "@/assets/template-thumbnails/hero.png";
import type { CardTemplateMeta } from "@/types/templates";

export const HERO_CARD_TEMPLATE: CardTemplateMeta = {
  id: "hero",
  name: "Hero Card",
  kind: "character",
  description: "Character-style card with full stats row and large hero artwork.",
  thumbnail: heroThumbnail,
  background: parchmentBackground,
  defaultFace: "front",
};
