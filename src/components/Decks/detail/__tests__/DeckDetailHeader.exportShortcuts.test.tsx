import { act, render } from "@testing-library/react";

const mockDeckExportButton = jest.fn();

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Decks/CardFan", () => ({
  __esModule: true,
  default: () => <div data-testid="card-fan" />,
}));

jest.mock("@/components/Decks/DeckExportButton", () => {
  const React = require("react") as typeof import("react");

  return {
    __esModule: true,
    default: React.forwardRef(
      (
        props: {
          deckId?: string | null;
          scope: "decks_grid" | "deck_detail";
          disabled?: boolean;
          label?: string;
          className?: string;
        },
        ref: React.ForwardedRef<{
          toggleMenu: () => boolean;
          closeMenu: () => boolean;
          isMenuOpen: () => boolean;
          runImageExport: () => Promise<boolean>;
          runPdfExport: () => Promise<boolean>;
        }>,
      ) => {
        const isOpenRef = React.useRef(false);
        const api = React.useMemo(
          () => ({
            toggleMenu: () => {
              isOpenRef.current = !isOpenRef.current;
              return true;
            },
            closeMenu: () => {
              isOpenRef.current = false;
              return true;
            },
            isMenuOpen: () => isOpenRef.current,
            runImageExport: async () => {
              isOpenRef.current = false;
              return true;
            },
            runPdfExport: async () => {
              isOpenRef.current = false;
              return true;
            },
          }),
          [],
        );

        React.useImperativeHandle(ref, () => api, [api]);
        mockDeckExportButton(props);
        return <button type="button">{props.label ?? "Export"}</button>;
      },
    ),
  };
});

import DeckDetailHeader from "@/components/Decks/detail/DeckDetailHeader";

describe("DeckDetailHeader export shortcuts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers deck-detail export shortcut handlers with toggle and option gating behavior", async () => {
    const onRouteShortcutHandlersReady = jest.fn();

    render(
      <DeckDetailHeader
        deckId="deck-1"
        deckTitle="Deck 1"
        onRouteShortcutHandlersReady={onRouteShortcutHandlersReady}
      />,
    );

    const handlers = onRouteShortcutHandlersReady.mock.calls.at(-1)?.[0] as
      | Record<string, () => boolean | Promise<boolean>>
      | undefined;
    expect(handlers).toBeDefined();
    expect(Object.keys(handlers ?? {})).toEqual(["e", "i", "p"]);

    await expect(handlers?.i()).resolves.toBe(false);
    await expect(handlers?.p()).resolves.toBe(false);

    expect(handlers?.e()).toBe(true);
    await expect(handlers?.i()).resolves.toBe(true);
    expect(handlers?.e()).toBe(true);
    await expect(handlers?.p()).resolves.toBe(true);
  });

  it("clears deck-detail export shortcut handlers on unmount", () => {
    const onRouteShortcutHandlersReady = jest.fn();
    const view = render(
      <DeckDetailHeader
        deckId="deck-1"
        deckTitle="Deck 1"
        onRouteShortcutHandlersReady={onRouteShortcutHandlersReady}
      />,
    );

    act(() => {
      view.unmount();
    });

    expect(onRouteShortcutHandlersReady).toHaveBeenLastCalledWith(null);
  });
});
