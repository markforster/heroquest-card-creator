import { render, screen, waitFor } from "@testing-library/react";

const mockResolveDeckPreviewIds = jest.fn();
const mockCardFan = jest.fn();

jest.mock("@/components/Decks/deck-preview", () => ({
  resolveDeckPreviewIds: (...args: unknown[]) => mockResolveDeckPreviewIds(...args),
}));

jest.mock("@/components/Decks/CardFan", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    mockCardFan(props);
    return <div data-testid="deck-fan-stub">fan</div>;
  },
}));

import DeckFanByDeckId from "@/components/Decks/DeckFanByDeckId";
import { DEFAULT_DECK_FAN_PREVIEW_COUNT } from "@/components/Decks/deck-fan.constants";

describe("DeckFanByDeckId", () => {
  beforeEach(() => {
    mockResolveDeckPreviewIds.mockReset();
    mockCardFan.mockReset();
  });

  it("resolves preview ids with default maxCount", async () => {
    mockResolveDeckPreviewIds.mockResolvedValue(["b1", "f1"]);

    render(<DeckFanByDeckId deckId="deck-1" />);

    await waitFor(() => {
      expect(mockResolveDeckPreviewIds).toHaveBeenCalledWith({
        deckId: "deck-1",
        maxCount: DEFAULT_DECK_FAN_PREVIEW_COUNT,
      });
    });

    const latestProps = mockCardFan.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestProps.variant).toBe("sm");
    expect(latestProps.maxCount).toBe(DEFAULT_DECK_FAN_PREVIEW_COUNT);
    expect(latestProps.cardIds).toEqual(["b1", "f1"]);
  });

  it("honors maxCount override", async () => {
    mockResolveDeckPreviewIds.mockResolvedValue(["x1"]);

    render(<DeckFanByDeckId deckId="deck-2" maxCount={4} variant="xs" />);

    await waitFor(() => {
      expect(mockResolveDeckPreviewIds).toHaveBeenCalledWith({ deckId: "deck-2", maxCount: 4 });
    });

    const latestProps = mockCardFan.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(latestProps.maxCount).toBe(4);
    expect(latestProps.variant).toBe("xs");
  });

  it("falls back to empty ids on resolver error", async () => {
    mockResolveDeckPreviewIds.mockRejectedValue(new Error("boom"));

    render(<DeckFanByDeckId deckId="deck-4" />);

    await waitFor(() => {
      const latestProps = mockCardFan.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(latestProps.cardIds).toEqual([]);
    });

    expect(screen.getByTestId("deck-fan-stub")).toBeInTheDocument();
  });
});
