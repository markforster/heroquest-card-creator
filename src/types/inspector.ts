import type { MessageKey } from "@/i18n/messages";
import type { TemplateId } from "@/types/templates";

export type InspectorTitleField = {
  fieldType: "title";
  bind: "title";
  labelKey: MessageKey;
  required?: boolean;
};

export type InspectorTextField = {
  fieldType: "text";
  bind: "description";
  labelKey: MessageKey;
  props?: {
    rows?: number;
  };
};

export type InspectorStatsField = {
  fieldType: "stats";
  statsType: "hero" | "monster";
  labelKey: MessageKey;
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

export type InspectorImageField = {
  fieldType: "image";
  bind: "imageAssetId";
  labelKey: MessageKey;
  props: {
    boundsWidth: number;
    boundsHeight: number;
  };
};

export type InspectorMonsterIconField = {
  fieldType: "monsterIcon";
  bind: "iconAssetId";
  labelKey: MessageKey;
};

export type InspectorBorderColorField = {
  fieldType: "borderColor";
  bind: "borderColor";
  labelKey: MessageKey;
};

export type InspectorField =
  | InspectorTitleField
  | InspectorTextField
  | InspectorStatsField
  | InspectorImageField
  | InspectorMonsterIconField
  | InspectorBorderColorField;

export type InspectorFieldsByTemplate = Record<TemplateId, InspectorField[]>;
