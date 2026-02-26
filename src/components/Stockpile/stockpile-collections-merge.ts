export function mergeCollectionCardIds(existing: string[], add: string[]) {
  const set = new Set(existing);
  add.forEach((id) => set.add(id));
  return Array.from(set);
}
