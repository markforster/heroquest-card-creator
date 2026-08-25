import { cardCreateInputSchema, cardUpdateInputSchema } from "@/api/cards";

describe("card schemas", () => {
  it("accepts bodyTextFitToBounds in create payloads", () => {
    const parsed = cardCreateInputSchema.parse({
      templateId: "hero",
      status: "saved",
      name: "Schema Card",
      bodyTextFitToBounds: true,
    });

    expect(parsed.bodyTextFitToBounds).toBe(true);
  });

  it("accepts duplicateFromCardId in create payloads", () => {
    const parsed = cardCreateInputSchema.parse({
      templateId: "hero",
      status: "saved",
      name: "Schema Card",
      duplicateFromCardId: "source-card",
    });

    expect(parsed.duplicateFromCardId).toBe("source-card");
  });

  it.each([{ flags: [] }, { flags: [true] }, { flags: [false, true] }])(
    "accepts valid stat asterisk flags in create payloads: $flags",
    ({ flags }) => {
      const parsed = cardCreateInputSchema.parse({
        templateId: "hero",
        status: "saved",
        name: "Schema Card",
        heroAttackDiceAsterisks: flags,
      });

      expect(parsed.heroAttackDiceAsterisks).toEqual(flags);
    },
  );

  it("rejects more than two stat asterisk flags", () => {
    expect(() =>
      cardCreateInputSchema.parse({
        templateId: "hero",
        status: "saved",
        name: "Schema Card",
        heroAttackDiceAsterisks: [true, false, true],
      }),
    ).toThrow();
  });

  it("accepts bodyTextFitToBounds in update payloads", () => {
    const parsed = cardUpdateInputSchema.parse({
      bodyTextFitToBounds: true,
    });

    expect(parsed.bodyTextFitToBounds).toBe(true);
  });

  it("accepts optional custom name state in create and update payloads", () => {
    const createParsed = cardCreateInputSchema.parse({
      templateId: "hero",
      status: "saved",
      name: "Female Barbarian",
      title: "Barbarian",
      customNameEnabled: true,
    });
    const updateParsed = cardUpdateInputSchema.parse({
      customNameEnabled: false,
    });

    expect(createParsed.customNameEnabled).toBe(true);
    expect(updateParsed.customNameEnabled).toBe(false);
  });

  it("accepts optional artwork clip edge fields in update payloads", () => {
    const parsed = cardUpdateInputSchema.parse({
      imageClipEdgeMask: 1,
      imageClipBottom: 760,
    });

    expect(parsed.imageClipEdgeMask).toBe(1);
    expect(parsed.imageClipBottom).toBe(760);
  });

  it("accepts optional title typography values and rejects unknown values", () => {
    const parsed = cardUpdateInputSchema.parse({
      titleTypography: "boldItalic",
    });

    expect(parsed.titleTypography).toBe("boldItalic");
    expect(() =>
      cardUpdateInputSchema.parse({
        titleTypography: "italic",
      }),
    ).toThrow();
  });

  it("accepts standard background tint blend modes and rejects canvas-only operations", () => {
    const parsed = cardUpdateInputSchema.parse({
      backgroundTintBlendMode: "screen",
    });

    expect(parsed.backgroundTintBlendMode).toBe("screen");
    expect(() =>
      cardUpdateInputSchema.parse({
        backgroundTintBlendMode: "source-over",
      }),
    ).toThrow();
  });
});
