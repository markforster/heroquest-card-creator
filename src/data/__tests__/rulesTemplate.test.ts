import { templateIdSchema } from "@/api/shared/schema";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { cardTemplates, cardTemplatesById } from "@/data/card-templates";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { templateNameLabels } from "@/i18n/messages";

describe("Rules template", () => {
  it("registers as a front-face template after artwork templates", () => {
    expect(templateIdSchema.parse("rules")).toBe("rules");
    expect(cardTemplatesById.rules).toEqual(
      expect.objectContaining({
        id: "rules",
        name: "Rules",
        kind: "other",
        defaultFace: "front",
      }),
    );
    expect(cardTemplates.map((template) => template.id)).toEqual(
      expect.arrayContaining(["large-treasure", "rules", "hero-back"]),
    );
    expect(cardTemplates.findIndex((template) => template.id === "large-treasure")).toBeLessThan(
      cardTemplates.findIndex((template) => template.id === "rules"),
    );
    expect(cardTemplates.findIndex((template) => template.id === "rules")).toBeLessThan(
      cardTemplates.findIndex((template) => template.id === "hero-back"),
    );
  });

  it("contains only the template background and inset body text", () => {
    expect(blueprintsByTemplateId.rules).toEqual(
      expect.objectContaining({
        templateId: "rules",
        layers: [
          expect.objectContaining({
            id: "hq.2021.background.base",
            type: "background",
            source: "template",
          }),
          expect.objectContaining({
            id: "hq.2021.text.body",
            type: "text",
            bounds: { x: 45, y: 55, width: 660, height: 955 },
            bind: { textKey: "description" },
            props: expect.objectContaining({
              align: "left",
              textLayoutMode: "fixed-bounds",
            }),
          }),
        ],
      }),
    );
  });

  it("exposes only required name and rules text inspector fields", () => {
    expect(inspectorFieldsByTemplate.rules).toEqual([
      expect.objectContaining({ fieldType: "name", bind: "name", required: true }),
      expect.objectContaining({
        fieldType: "text",
        bind: "description",
        labelKey: "form.rulesText",
        props: { showTextColor: true },
      }),
    ]);
  });

  it("provides a localized template label in every supported language", () => {
    Object.values(templateNameLabels).forEach((labels) => {
      expect(labels.rules).toEqual(expect.any(String));
      expect(labels.rules).not.toHaveLength(0);
    });
  });
});
