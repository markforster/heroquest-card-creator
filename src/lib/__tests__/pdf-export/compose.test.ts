jest.mock("@/api/client", () => ({
  apiClient: {},
}));

jest.mock("@/components/Decks/deck-preview", () => ({
  listPairsMap: jest.fn(),
}));

import { composePrintComposition } from "@/lib/pdf-export/compose";

describe("pdf-export compose", () => {
  it("chunks slot pairs by page capacity", () => {
    const slots = [
      { slotId: "1", frontId: "f1", backId: "b1" },
      { slotId: "2", frontId: "f2", backId: "b2" },
      { slotId: "3", frontId: "f3", backId: "b3" },
    ];
    const composition = composePrintComposition(slots, 2);
    expect(composition.totalSlots).toBe(3);
    expect(composition.sheets).toHaveLength(2);
    expect(composition.sheets[0].slots).toHaveLength(2);
    expect(composition.sheets[1].slots).toHaveLength(1);
  });
});
