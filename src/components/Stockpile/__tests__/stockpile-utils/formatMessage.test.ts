import { formatMessage } from "@/components/Stockpile/stockpile-utils";

describe("formatMessage", () => {
  it("replaces named tokens with values", () => {
    const template = "Hello { name } and {name}!";
    const result = formatMessage(template, { name: "Hero" });
    expect(result).toBe("Hello Hero and Hero!");
  });

  it("handles token names with regex characters", () => {
    const template = "Value: {a.b} {a.b}";
    const result = formatMessage(template, { "a.b": 42 });
    expect(result).toBe("Value: 42 42");
  });
});
