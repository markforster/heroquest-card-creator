import type { CardFace } from "./card-face";
import type { StaticImageData } from "next/image";

export type TemplateId =
  | "hero"
  | "monster"
  | "large-treasure"
  | "small-treasure"
  | "rules"
  | "hero-back"
  | "logo-back"
  | "labelled-back";

export const TEMPLATE_IDS: TemplateId[] = [
  "hero",
  "monster",
  "large-treasure",
  "small-treasure",
  "rules",
  "hero-back",
  "logo-back",
  "labelled-back",
];

export type TemplateKind = "character" | "monster" | "treasure" | "back" | "custom" | "other";

export type CardTemplateMeta = {
  id: TemplateId;
  name: string;
  kind: TemplateKind;
  description: string;
  thumbnail: StaticImageData;
  background: StaticImageData;
  defaultFace: CardFace;
  isExperimental?: boolean;
};
