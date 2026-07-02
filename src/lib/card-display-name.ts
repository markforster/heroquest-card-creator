type CardNameLike = {
  title?: string | null;
  name?: string | null;
};

export function getCardDisplayName(card: CardNameLike | null | undefined, fallback: string): string {
  const title = card?.title?.trim();
  if (title) return title;

  const name = card?.name?.trim();
  if (name) return name;

  return fallback;
}
