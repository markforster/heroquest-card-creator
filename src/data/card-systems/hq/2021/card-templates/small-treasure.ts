import windowParchmentBackground from "@/assets/card-backgrounds/window-parchment.png";
import smallTreasureThumbnail from "@/assets/template-thumbnails/small-treasure.png";
import type { CardTemplateMeta } from "@/types/templates";

export const SMALL_TREASURE_CARD_TEMPLATE: CardTemplateMeta = {
  id: "small-treasure",
  name: "Small Artwork",
  kind: "treasure",
  description: "Card with smaller artwork window and large rules text area.",
  thumbnail: smallTreasureThumbnail,
  background: windowParchmentBackground,
  defaultFace: "front",
};
