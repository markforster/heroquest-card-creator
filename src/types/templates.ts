import type { CardDataByTemplate } from "./card-data";
import type { StaticImageData } from "next/image";
import type { ComponentType } from "react";

export type TemplateId =
  | "hero"
  | "monster"
  | "large-treasure"
  | "small-treasure"
  | "hero-back"
  | "labelled-back";

export type TemplateKind = "character" | "monster" | "treasure" | "back" | "custom" | "other";

export type TemplateRenderProps = {
  templateName?: string;
  background: StaticImageData;
  backgroundLoaded: boolean;
  cardData?: CardDataByTemplate[TemplateId];
};

export type CardTemplateComponent = ComponentType<TemplateRenderProps>;

export type CardTemplateMeta = {
  id: TemplateId;
  name: string;
  kind: TemplateKind;
  description: string;
  thumbnail: StaticImageData;
  background: StaticImageData;
  isExperimental?: boolean;
};
