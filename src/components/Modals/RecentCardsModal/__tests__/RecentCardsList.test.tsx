import { fireEvent, render, screen } from "@testing-library/react";

import RecentCardsList from "@/components/Modals/RecentCardsModal/RecentCardsList";
import type { RecentCardGroup } from "@/components/Modals/RecentCardsModal/useRecentCards";
import type { CardRecord } from "@/api/cards";

jest.mock("@/components/common/CardThumbnail", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <div data-testid="thumb">{alt}</div>,
}));
jest.mock("@/lib/card-thumbnail-cache", () => ({
  __esModule: true,
  invalidateCardThumbnail: jest.fn(),
  useCardThumbnailUrl: () => null,
}));
jest.mock("@/data/card-templates", () => ({
  __esModule: true,
  cardTemplatesById: {
    hero: {
      id: "hero",
      name: "Hero",
      thumbnail: { src: "/thumbs/hero.png" },
    },
  },
}));
jest.mock("@/i18n/getTemplateNameLabel", () => ({
  __esModule: true,
  getTemplateNameLabel: () => "Hero Card",
}));
jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "recent.group.today": "Today",
        "recent.group.thisWeek": "This Week",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("RecentCardsList", () => {
  function buildCard(overrides?: Partial<CardRecord>): CardRecord {
    return {
      id: "card-1",
      templateId: "hero",
      status: "saved",
      name: "Potion",
      nameLower: "potion",
      createdAt: 1,
      updatedAt: 2,
      schemaVersion: 2,
      thumbnailBlob: null,
      ...overrides,
    };
  }

  function renderList(cards: RecentCardGroup[], onSelectCard = jest.fn(), onClose = jest.fn()) {
    render(<RecentCardsList cards={cards} onSelectCard={onSelectCard} onClose={onClose} />);
    return { onSelectCard, onClose };
  }

  it("renders grouped recent cards using the shared title and type pill composition", () => {
    renderList([
      {
        id: "today",
        labelKey: "recent.group.today",
        cards: [buildCard()],
      },
    ]);

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByTitle("Potion")).toBeInTheDocument();
    expect(screen.getByText("Hero Card")).toBeInTheDocument();
    expect(screen.getByTestId("thumb")).toHaveTextContent("Potion");
  });

  it("preserves the recent modal select-and-close behavior", () => {
    const card = buildCard();
    const onSelectCard = jest.fn(() => true);
    const onClose = jest.fn();

    renderList(
      [
        {
          id: "today",
          labelKey: "recent.group.today",
          cards: [card],
        },
      ],
      onSelectCard,
      onClose,
    );

    fireEvent.click(screen.getByRole("button", { name: /Potion/ }));

    expect(onSelectCard).toHaveBeenCalledWith(card);
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the modal open when the selection callback returns false", () => {
    const onSelectCard = jest.fn(() => false);
    const onClose = jest.fn();

    renderList(
      [
        {
          id: "thisWeek",
          labelKey: "recent.group.thisWeek",
          cards: [buildCard({ id: "card-2", name: "Warden", nameLower: "warden" })],
        },
      ],
      onSelectCard,
      onClose,
    );

    fireEvent.click(screen.getByRole("button", { name: /Warden/ }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
