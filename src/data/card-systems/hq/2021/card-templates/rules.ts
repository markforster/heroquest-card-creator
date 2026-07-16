import parchmentBackground from "@/assets/card-backgrounds/parchment.png";
import rulesThumbnail from "@/assets/template-thumbnails/rules.png";
import type { CardTemplateMeta } from "@/types/templates";

export const RULES_CARD_TEMPLATE: CardTemplateMeta = {
  id: "rules",
  name: "Rules",
  kind: "other",
  description: "Parchment card for rules and reference text.",
  thumbnail: rulesThumbnail,
  background: parchmentBackground,
  defaultFace: "front",
};
