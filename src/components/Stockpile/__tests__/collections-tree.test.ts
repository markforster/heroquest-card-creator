import { buildCollectionsTree } from "@/components/Stockpile/collections-tree";
import type { CollectionRecord } from "@/types/collections-db";

const baseCollection = (overrides: Partial<CollectionRecord>): CollectionRecord => ({
  id: "collection",
  name: "Collection",
  cardIds: [],
  createdAt: 0,
  updatedAt: 0,
  schemaVersion: 1,
  ...overrides,
});

describe("buildCollectionsTree", () => {
  it("builds folders for shared path prefixes", () => {
    const collections = [
      baseCollection({ id: "c1", name: "spells/fire" }),
      baseCollection({ id: "c2", name: "spells/air" }),
      baseCollection({ id: "c3", name: "gear/swords" }),
    ];
    const collectionCounts = new Map<string, number>([
      ["c1", 2],
      ["c2", 1],
      ["c3", 3],
    ]);

    const result = buildCollectionsTree(collections, { collectionCounts });
    const labels = result.nodes.map((node) => node.label);

    expect(labels).toEqual(["gear", "spells"]);
    const spells = result.nodes[1];
    expect(spells.type).toBe("folder");
    if (spells.type === "folder") {
      expect(spells.children.map((child) => child.label)).toEqual(["air", "fire"]);
      expect(spells.count).toBe(3);
    }
  });

  it("renders both folder and leaf when a collection matches a folder path", () => {
    const collections = [
      baseCollection({ id: "c1", name: "spells" }),
      baseCollection({ id: "c2", name: "spells/fire" }),
    ];
    const collectionCounts = new Map<string, number>([
      ["c1", 1],
      ["c2", 2],
    ]);

    const result = buildCollectionsTree(collections, { collectionCounts });
    const spells = result.nodes[0];
    expect(spells.type).toBe("folder");
    if (spells.type === "folder") {
      expect(spells.children.map((child) => child.label)).toEqual(["fire", "spells"]);
    }
  });

  it("aggregates missing artwork flags for folders", () => {
    const collections = [
      baseCollection({ id: "c1", name: "spells/fire" }),
      baseCollection({ id: "c2", name: "spells/air" }),
    ];
    const collectionCounts = new Map<string, number>([
      ["c1", 2],
      ["c2", 1],
    ]);
    const missing = new Set<string>(["c2"]);

    const result = buildCollectionsTree(collections, {
      collectionCounts,
      collectionsWithMissingArtwork: missing,
    });
    const spells = result.nodes[0];
    expect(spells.type).toBe("folder");
    if (spells.type === "folder") {
      expect(spells.hasMissingArtwork).toBe(true);
      expect(spells.count).toBe(3);
    }
  });
});
