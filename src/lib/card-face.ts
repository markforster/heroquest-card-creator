import type { CardFace } from "@/types/card-face";

export function resolveEffectiveFace(
  cardFace: CardFace | undefined,
  defaultFace: CardFace,
): CardFace {
  return cardFace ?? defaultFace;
}
