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
});
