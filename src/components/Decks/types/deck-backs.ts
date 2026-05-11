export type DeckFaceFilter =
  | { type: "all" }
  | { type: "recent" }
  | { type: "unfiled" }
  | { type: "recentlyDeleted" }
  | { type: "collection"; id: string };

export type RightPanelFaceMode = "back" | "front";
