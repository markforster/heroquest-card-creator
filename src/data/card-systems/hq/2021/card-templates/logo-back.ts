import heroBackNoEyeBackground from "@/assets/card-backgrounds/hero-back-no-eye.png";
import logoBackThumbnail from "@/assets/template-thumbnails/logo-back.png";
import type { CardTemplateMeta } from "@/types/templates";

export const LOGO_BACK_CARD_TEMPLATE: CardTemplateMeta = {
  id: "logo-back",
  name: "Logo Back",
  kind: "back",
  description: "Parchment back design with a large vertical logo.",
  thumbnail: logoBackThumbnail,
  background: heroBackNoEyeBackground,
  defaultFace: "back",
};
