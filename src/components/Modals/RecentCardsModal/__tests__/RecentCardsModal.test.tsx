import { act, render, screen, waitFor } from "@testing-library/react";

import type { CardRecord } from "@/api/cards";
import RecentCardsModal from "@/components/Modals/RecentCardsModal";

import type { ReactNode } from "react";

const listCards = jest.fn();

jest.mock("@/api/client", () => ({
  __esModule: true,
  apiClient: {
    listCards: (...args: unknown[]) => listCards(...args),
  },
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({
    isOpen,
    children,
    title,
  }: {
    isOpen: boolean;
    children: ReactNode;
    title: string;
  }) => (isOpen ? <div><div>{title}</div>{children}</div> : null),
}));

jest.mock("@/components/Modals/RecentCardsModal/LoadingMessage", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/Modals/RecentCardsModal/RecentCardsList", () => ({
  __esModule: true,
  default: ({ cards }: { cards: Array<{ cards: CardRecord[] }> }) => (
    <div data-testid="recent-cards-list">{cards.flatMap((group) => group.cards).map((card) => card.name).join(",")}</div>
  ),
}));

jest.mock("@/components/Modals/RecentCardsModal/useRecentCards", () => ({
  __esModule: true,
  useRecentCards: ({ cards }: { cards: CardRecord[] }) => [
    { id: "today", labelKey: "recent.group.today", cards },
  ],
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    language: "en",
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "actions.recentCards": "Recent Cards",
        "empty.noRecentCards": "No recent cards",
        "ui.loading": "Loading",
      };
      return lookup[key] ?? key;
    },
  }),
}));

describe("RecentCardsModal", () => {
  function buildCard(id: string, name: string): CardRecord {
    return {
      id,
      templateId: "hero",
      status: "saved",
      name,
      nameLower: name.toLowerCase(),
      createdAt: 1,
      updatedAt: 2,
      schemaVersion: 2,
      thumbnailBlob: null,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    listCards.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("refetches cards when the shared cards-updated event fires while open", async () => {
    listCards
      .mockResolvedValueOnce([buildCard("card-1", "Old Logo Card")])
      .mockResolvedValueOnce([buildCard("card-1", "New Logo Card")]);

    render(
      <RecentCardsModal
        isOpen
        onClose={jest.fn()}
        onSelectCard={jest.fn()}
      />,
    );

    expect(await screen.findByTestId("recent-cards-list")).toHaveTextContent("Old Logo Card");

    act(() => {
      window.dispatchEvent(new CustomEvent("hqcc-cards-updated"));
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId("recent-cards-list")).toHaveTextContent("New Logo Card");
    });
    expect(listCards).toHaveBeenCalledTimes(2);
  });
});
