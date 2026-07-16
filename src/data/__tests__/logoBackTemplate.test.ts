import { templateIdSchema } from "@/api/shared/schema";
import { blueprintsByTemplateId } from "@/data/blueprints";
import { cardTemplatesById } from "@/data/card-templates";
import { inspectorFieldsByTemplate } from "@/data/inspector-fields";
import { templateNameLabels } from "@/i18n/messages";

describe("Logo Back template", () => {
  it("registers as a back-face template with its dedicated blueprint", () => {
    expect(templateIdSchema.parse("logo-back")).toBe("logo-back");
    expect(cardTemplatesById["logo-back"]).toEqual(
      expect.objectContaining({
        id: "logo-back",
        name: "Logo Back",
        kind: "back",
        defaultFace: "back",
      }),
    );
    expect(blueprintsByTemplateId["logo-back"]).toEqual(
      expect.objectContaining({
        templateId: "logo-back",
        layers: expect.arrayContaining([
          expect.objectContaining({
            type: "logo",
            rotation: -90,
            bounds: { x: 218, y: 70, width: 322, height: 898 },
          }),
        ]),
      }),
    );
  });

  it("exposes only name, tint, and logo inspector controls", () => {
    expect(inspectorFieldsByTemplate["logo-back"].map((field) => field.fieldType)).toEqual([
      "name",
      "backgroundTint",
      "heroBackLogo",
    ]);
  });

  it("provides a localized label in every supported language", () => {
    Object.values(templateNameLabels).forEach((labels) => {
      expect(labels["logo-back"]).toEqual(expect.any(String));
      expect(labels["logo-back"]).not.toHaveLength(0);
    });
  });
});
