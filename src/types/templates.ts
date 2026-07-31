import type { CardFace } from "./card-face";
import type { StaticImageData } from "next/image";

/**
 * Card template identifiers supported by the editor and persistence layer.
 */
export type TemplateId =
  | "hero"
  | "monster"
  | "large-treasure"
  | "small-treasure"
  | "rules"
  | "hero-back"
  | "logo-back"
  | "labelled-back";

/**
 * Stable ordered list of supported template ids used by selectors and normalization helpers.
 */
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

/**
 * Broad grouping used to categorize templates in the UI.
 */
export type TemplateKind = "character" | "monster" | "treasure" | "back" | "custom" | "other";

/**
 * Template metadata used by pickers, preview tiles, and blueprint selection.
 */
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
