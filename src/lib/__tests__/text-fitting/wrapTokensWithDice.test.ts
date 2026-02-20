import { wrapTokens } from "@/lib/text-fitting/wrap";

describe("wrapTokens (dice)", () => {
  it("treats dice tokens as atomic width", () => {
    const tokens = [
      { kind: "text" as const, text: "A" },
      {
        kind: "dice" as const,
        width: 20,
        dice: {
          kind: "dice" as const,
          type: "combat" as const,
          face: "skull" as const,
          color: "#ffffff",
          svgUrl: "/fake.svg",
        },
      },
      { kind: "text" as const, text: "B" },
    ];

    const measure = (text: string) => (text === "A" || text === "B" ? 10 : 0);
    const lines = wrapTokens(tokens, 15, measure);

    expect(lines.length).toBe(3);
    expect(lines[0]).toEqual([{ kind: "text", text: "A" }]);
    expect(lines[1][0].kind).toBe("dice");
    expect(lines[2]).toEqual([{ kind: "text", text: "B" }]);
  });
});
