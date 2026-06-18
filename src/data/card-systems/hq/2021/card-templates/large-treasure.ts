import windowParchmentBackground from "@/assets/card-backgrounds/window-parchment.png";
import largeTreasureThumbnail from "@/assets/template-thumbnails/large-treasure.png";
import type { CardTemplateMeta } from "@/types/templates";

export const LARGE_TREASURE_CARD_TEMPLATE: CardTemplateMeta = {
  id: "large-treasure",
  name: "Large Artwork",
  kind: "treasure",
  description: "Card with large artwork area and supporting rules text.",
  thumbnail: largeTreasureThumbnail,
  background: windowParchmentBackground,
  defaultFace: "front",
};
