import {
  blueprintsByTemplateId,
  getCopyrightBounds,
} from "@/data/blueprints";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import {
  blueprintsByTemplateId as familyBlueprintsByTemplateId,
  getCopyrightBounds as getFamilyCopyrightBounds,
} from "@/data/card-systems/hq/2021/blueprints";
import {
  cardTemplates as familyCardTemplates,
  cardTemplatesById as familyCardTemplatesById,
} from "@/data/card-systems/hq/2021/card-templates";
import { inspectorFieldsByTemplate as familyInspectorFieldsByTemplate } from "@/data/card-systems/hq/2021/inspector-fields";

describe("top-level data barrels", () => {
  it("re-exports the assembled hq.2021 blueprint registry and helpers", () => {
    expect(blueprintsByTemplateId).toBe(familyBlueprintsByTemplateId);
    expect(getCopyrightBounds).toBe(getFamilyCopyrightBounds);
  });

  it("re-exports the assembled hq.2021 card templates", () => {
    expect(cardTemplates).toBe(familyCardTemplates);
    expect(cardTemplatesById).toBe(familyCardTemplatesById);
  });

  it("re-exports the assembled hq.2021 inspector fields", () => {
    expect(inspectorFieldsByTemplate).toBe(familyInspectorFieldsByTemplate);
  });
});
