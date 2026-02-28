export type DeleteCollectionImpact = {
  name: string;
  removedCount: number;
  unfiledCount: number;
};

export function getDeleteCollectionImpact(args: {
  collectionId: string;
  collections: Array<{ id: string; name: string; cardIds: string[] }>;
  existingCardIdSet: Set<string>;
}): DeleteCollectionImpact | null {
  const { collectionId, collections, existingCardIdSet } = args;
  const target = collections.find((collection) => collection.id === collectionId);
  if (!target) return null;

  const removedIdSet = new Set<string>();
  target.cardIds.forEach((cardId) => {
    if (existingCardIdSet.has(cardId)) {
      removedIdSet.add(cardId);
    }
  });

  const otherMembershipSet = new Set<string>();
  collections.forEach((collection) => {
    if (collection.id === collectionId) return;
    collection.cardIds.forEach((cardId) => {
      if (existingCardIdSet.has(cardId)) {
        otherMembershipSet.add(cardId);
      }
    });
  });

  let unfiledCount = 0;
  removedIdSet.forEach((cardId) => {
    if (!otherMembershipSet.has(cardId)) {
      unfiledCount += 1;
    }
  });

  return {
    name: target.name,
    removedCount: removedIdSet.size,
    unfiledCount,
  };
}

