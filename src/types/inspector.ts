import type { TemplateId } from "@/types/templates";

export type InspectorTitleField = {
  fieldType: "title";
  bind: "title";
  labelKey: string;
  required?: boolean;
};

export type InspectorTextField = {
  fieldType: "text";
  bind: "description";
  labelKey: string;
  props?: {
    rows?: number;
  };
};

export type InspectorStatsField = {
  fieldType: "stats";
  statsType: "hero" | "monster";
  labelKey: string;
};

export type InspectorImageField = {
  fieldType: "image";
  bind: "imageAssetId";
  labelKey: string;
  props: {
    boundsWidth: number;
    boundsHeight: number;
  };
};

export type InspectorMonsterIconField = {
  fieldType: "monsterIcon";
  bind: "iconAssetId";
  labelKey: string;
};

export type InspectorField =
  | InspectorTitleField
  | InspectorTextField
  | InspectorStatsField
  | InspectorImageField
  | InspectorMonsterIconField;

export type InspectorFieldsByTemplate = Record<TemplateId, InspectorField[]>;
