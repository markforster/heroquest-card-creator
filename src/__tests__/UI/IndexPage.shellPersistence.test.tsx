/* eslint-disable @typescript-eslint/no-require-imports */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import IndexPage from "@/app/page";

import type { ReactNode } from "react";

let leftNavMounts = 0;
let leftNavUnmounts = 0;
let headerMounts = 0;
let headerUnmounts = 0;
let footerMounts = 0;
let footerUnmounts = 0;

jest.mock("@/components/DatabaseVersionGate", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/App/AppProviders", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/App/AppStartup", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Providers/LocalStorageProvider", () => ({
  __esModule: true,
  useLocalStorageBoolean: () => [false, jest.fn()],
}));

jest.mock("@/components/Providers/MissingAssetsContext", () => ({
  __esModule: true,
  useMissingAssets: () => ({ missingAssetsReport: [] }),
}));

jest.mock("@/components/Providers/LibraryTransferContext", () => ({
  __esModule: true,
  LibraryTransferProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/Providers/AppActionsContext", () => ({
  __esModule: true,
  AppActionsProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/Providers/AssetKindBackfillProvider", () => ({
  __esModule: true,
  AssetKindBackfillProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/components/common/EscapeStackProvider", () => ({
  __esModule: true,
  EscapeStackProvider: ({ children }: { children: ReactNode }) => children,
  useEscapeModalAware: () => undefined,
}));

jest.mock("@/components/common/Notice", () => ({
  __esModule: true,
  WarningNotice: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Layout/HeaderWithTemplatePicker", () => ({
  __esModule: true,
  default: function MockHeader() {
    const { useEffect } = require("react") as typeof import("react");

    useEffect(() => {
      headerMounts += 1;
      return () => {
        headerUnmounts += 1;
      };
    }, []);

    return <div data-testid="app-header">Header</div>;
  },
}));

jest.mock("@/components/Layout/LeftNav", () => ({
  __esModule: true,
  default: function MockLeftNav() {
    const { useEffect } = require("react") as typeof import("react");

    useEffect(() => {
      leftNavMounts += 1;
      return () => {
        leftNavUnmounts += 1;
      };
    }, []);

    return <div data-testid="app-left-nav">LeftNav</div>;
  },
}));

jest.mock("@/components/Layout/MainFooter", () => ({
  __esModule: true,
  default: function MockFooter() {
    const { useEffect } = require("react") as typeof import("react");

    useEffect(() => {
      footerMounts += 1;
      return () => {
        footerUnmounts += 1;
      };
    }, []);

    return <div data-testid="app-footer">Footer</div>;
  },
}));

jest.mock("@/components/App/pages/CardsPage", () => ({
  __esModule: true,
  default: function MockCardsPage() {
    const { useNavigate } = require("react-router-dom") as typeof import("react-router-dom");
    const navigate = useNavigate();

    return (
      <div>
        <div>Cards page</div>
        <button type="button" onClick={() => navigate("/cards/card-1")}>
          Open card detail
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/App/pages/CardPage", () => ({
  __esModule: true,
  default: function MockCardPage() {
    const { useNavigate } = require("react-router-dom") as typeof import("react-router-dom");
    const navigate = useNavigate();

    return (
      <div>
        <div>Card page</div>
        <button type="button" onClick={() => navigate("/assets")}>
          Open assets
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/App/pages/AssetsPage", () => ({
  __esModule: true,
  default: function MockAssetsPage() {
    const { useNavigate } = require("react-router-dom") as typeof import("react-router-dom");
    const navigate = useNavigate();

    return (
      <div>
        <div>Assets page</div>
        <button type="button" onClick={() => navigate("/decks")}>
          Open decks
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/App/pages/DecksPage", () => ({
  __esModule: true,
  default: () => <div>Decks page</div>,
}));

jest.mock("@/components/App/pages/DeckPage", () => ({
  __esModule: true,
  default: () => <div>Deck detail page</div>,
}));

beforeAll(() => {
  if (typeof Request === "undefined") {
    class MockRequest {
      body: BodyInit | null;
      credentials: RequestCredentials;
      headers: Headers;
      method: string;
      mode: RequestMode;
      signal: AbortSignal | null;
      url: string;

      constructor(input: string | URL, init: RequestInit = {}) {
        this.url = String(input);
        this.method = (init.method ?? "GET").toUpperCase();
        this.headers = new Headers(init.headers);
        this.body = init.body ?? null;
        this.signal = init.signal ?? null;
        this.mode = init.mode ?? "same-origin";
        this.credentials = init.credentials ?? "same-origin";
      }
    }

    Object.defineProperty(globalThis, "Request", {
      configurable: true,
      writable: true,
      value: MockRequest,
    });
  }
});

describe("IndexPage shell persistence", () => {
  beforeEach(() => {
    window.location.hash = "#/cards";
    leftNavMounts = 0;
    leftNavUnmounts = 0;
    headerMounts = 0;
    headerUnmounts = 0;
    footerMounts = 0;
    footerUnmounts = 0;
  });

  it("keeps shell chrome mounted across route navigation", async () => {
    render(<IndexPage />);

    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-left-nav")).toBeInTheDocument();
    expect(screen.getByTestId("app-footer")).toBeInTheDocument();
    expect(screen.getByText("Cards page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open card detail" }));
    await waitFor(() => {
      expect(screen.getByText("Card page")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open assets" }));
    await waitFor(() => {
      expect(screen.getByText("Assets page")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open decks" }));
    await waitFor(() => {
      expect(screen.getByText("Decks page")).toBeInTheDocument();
    });

    expect(leftNavMounts).toBe(1);
    expect(leftNavUnmounts).toBe(0);
    expect(headerMounts).toBe(1);
    expect(headerUnmounts).toBe(0);
    expect(footerMounts).toBe(1);
    expect(footerUnmounts).toBe(0);
  });
});
