import borderedMask from "@/assets/card-backgrounds/bordered-mask.png";
import labelledBackThumbnail from "@/assets/template-thumbnails/labelled-back.png";
import type { CardTemplateMeta } from "@/types/templates";

export const LABELLED_BACK_CARD_TEMPLATE: CardTemplateMeta = {
  id: "labelled-back",
  name: "Labelled Back",
  kind: "back",
  description: "Back design with a label/banner, e.g. 'Card Back'.",
  thumbnail: labelledBackThumbnail,
  background: borderedMask,
  defaultFace: "back",
};
