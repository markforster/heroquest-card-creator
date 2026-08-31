type CardNameLike = {
  title?: string | null;
  name?: string | null;
};

export function getCardDisplayName(
  card: CardNameLike | null | undefined,
  fallback: string,
): string {
  const name = card?.name?.trim();
  if (name) return name;

  const title = card?.title?.trim();
  if (title) return title;

  return fallback;
}
