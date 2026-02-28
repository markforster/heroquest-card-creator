import { parseDiceToken } from "@/lib/inline-dice";

describe("parseDiceToken", () => {
  it("parses combat skull with color", () => {
    const token = parseDiceToken("combat:skull:red");
    expect(token?.type).toBe("combat");
    expect(token?.face).toBe("skull");
    expect(token?.color).toBe("#b21d1d");
  });

  it("parses combat hero (shield) with default color", () => {
    const token = parseDiceToken("combat:hero");
    expect(token?.face).toBe("hero");
    expect(token?.color).toBe("#ffffff");
  });

  it("rejects unknown token", () => {
    expect(parseDiceToken("6d:1")).toBeNull();
    expect(parseDiceToken("combat:unknown")).toBeNull();
  });
});
