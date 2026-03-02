import { resolveEffectiveFace } from "@/lib/card-face";
import type { CardFace } from "@/types/card-face";

describe("resolveEffectiveFace", () => {
  it("prefers explicit card face", () => {
    const result = resolveEffectiveFace("front", "back");
    expect(result).toBe<CardFace>("front");
  });

  it("falls back to default face when undefined", () => {
    const result = resolveEffectiveFace(undefined, "back");
    expect(result).toBe<CardFace>("back");
  });

  it("defaults to front when defaultFace is front", () => {
    const result = resolveEffectiveFace(undefined, "front");
    expect(result).toBe<CardFace>("front");
  });
});
