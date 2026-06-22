import heroBackBackground from "@/assets/card-backgrounds/hero-back.png";
import heroBackThumbnail from "@/assets/template-thumbnails/hero-back.png";
import type { CardTemplateMeta } from "@/types/templates";

export const HERO_BACK_CARD_TEMPLATE: CardTemplateMeta = {
  id: "hero-back",
  name: "Hero Back",
  kind: "back",
  description: "Simple back design for hero or character decks.",
  thumbnail: heroBackThumbnail,
  background: heroBackBackground,
  defaultFace: "back",
};
