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

  it("accepts bodyTextFitToBounds in update payloads", () => {
    const parsed = cardUpdateInputSchema.parse({
      bodyTextFitToBounds: true,
    });

    expect(parsed.bodyTextFitToBounds).toBe(true);
  });
});
