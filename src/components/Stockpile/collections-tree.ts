import type { CollectionRecord } from "@/types/collections-db";

export type CollectionLeaf = {
  type: "leaf";
  id: string;
  name: string;
  label: string;
  description?: string;
  count: number;
  hasMissingArtwork: boolean;
};

export type FolderNode = {
  type: "folder";
  pathId: string;
  label: string;
  depth: number;
  children: Array<FolderNode | CollectionLeaf>;
  count: number;
  hasMissingArtwork: boolean;
};

type BuildCollectionsTreeOptions = {
  collectionCounts: Map<string, number>;
  collectionsWithMissingArtwork?: Set<string>;
};

const normalizeSegments = (name: string): string[] => {
  const segments = name
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return segments.length ? segments : [name.trim() || name];
};

const compareLabels = (a: { label: string }, b: { label: string }) =>
  a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

type CollectionLike = Pick<CollectionRecord, "id" | "name" | "description">;

export const buildCollectionsTree = (
  collections: CollectionLike[],
  { collectionCounts, collectionsWithMissingArtwork }: BuildCollectionsTreeOptions,
) => {
  const folderPaths = new Set<string>();

  collections.forEach((collection) => {
    const segments = normalizeSegments(collection.name);
    for (let i = 0; i < segments.length - 1; i += 1) {
      folderPaths.add(segments.slice(0, i + 1).join("/"));
    }
  });

  const root: FolderNode = {
    type: "folder",
    pathId: "",
    label: "",
    depth: 0,
    children: [],
    count: 0,
    hasMissingArtwork: false,
  };

  const folderMap = new Map<string, FolderNode>([["", root]]);

  const ensureFolder = (pathId: string, label: string, depth: number, parent: FolderNode) => {
    const existing = folderMap.get(pathId);
    if (existing) return existing;
    const next: FolderNode = {
      type: "folder",
      pathId,
      label,
      depth,
      children: [],
      count: 0,
      hasMissingArtwork: false,
    };
    parent.children.push(next);
    folderMap.set(pathId, next);
    return next;
  };

  collections.forEach((collection) => {
    const segments = normalizeSegments(collection.name);
    let parent = root;
    let createdLeaf = false;

    for (let i = 0; i < segments.length; i += 1) {
      const pathId = segments.slice(0, i + 1).join("/");
      if (folderPaths.has(pathId)) {
        parent = ensureFolder(pathId, segments[i], i + 1, parent);
        continue;
      }
      const label = segments[segments.length - 1];
      parent.children.push({
        type: "leaf",
        id: collection.id,
        name: collection.name,
        label,
        description: collection.description,
        count: collectionCounts.get(collection.id) ?? 0,
        hasMissingArtwork: collectionsWithMissingArtwork?.has(collection.id) ?? false,
      });
      createdLeaf = true;
      break;
    }

    if (!createdLeaf) {
      const label = segments[segments.length - 1];
      parent.children.push({
        type: "leaf",
        id: collection.id,
        name: collection.name,
        label,
        description: collection.description,
        count: collectionCounts.get(collection.id) ?? 0,
        hasMissingArtwork: collectionsWithMissingArtwork?.has(collection.id) ?? false,
      });
    }
  });

  const sortAndAggregate = (node: FolderNode) => {
    node.children.forEach((child) => {
      if (child.type === "folder") {
        sortAndAggregate(child);
      }
    });

    const folderChildren = node.children
      .filter((child): child is FolderNode => child.type === "folder")
      .sort(compareLabels);
    const leafChildren = node.children
      .filter((child): child is CollectionLeaf => child.type === "leaf")
      .sort(compareLabels);
    node.children = [...folderChildren, ...leafChildren];

    node.count = node.children.reduce((total, child) => {
      return total + (child.type === "folder" ? child.count : child.count);
    }, 0);
    node.hasMissingArtwork = node.children.some((child) =>
      child.type === "folder" ? child.hasMissingArtwork : child.hasMissingArtwork,
    );
  };

  sortAndAggregate(root);

  return {
    nodes: root.children,
    folderPathIds: Array.from(folderPaths),
  };
};
