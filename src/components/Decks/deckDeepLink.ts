export type DeckDeepLinkTarget = {
  deckId: string;
  setId?: string | null;
  entryId?: string | null;
};

export function buildDeckDeepLink({ deckId, setId, entryId }: DeckDeepLinkTarget): string {
  if (!deckId) return "/decks";
  if (setId && entryId) return `/decks/${deckId}/set/${setId}/entry/${entryId}`;
  if (setId) return `/decks/${deckId}/set/${setId}`;
  return `/decks/${deckId}`;
}
