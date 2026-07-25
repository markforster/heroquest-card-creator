import { render, screen } from "@testing-library/react";

import MainFooter from "@/components/Layout/MainFooter";

import type { ReactNode } from "react";

const mockCurrentTip = { source: "stockpile", message: "Stockpile tip message", icon: "lightbulb" };
let currentTip: typeof mockCurrentTip | null = null;

jest.mock("react-device-detect", () => ({
  isMobile: false,
  isTablet: false,
}));

jest.mock("@/components/Layout/LeftNav/useMediaQuery", () => ({
  __esModule: true,
  useMediaQuery: () => false,
}));

jest.mock("@/components/Modals/HelpModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/Modals/ReleaseNotesModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/Providers/AnalyticsProvider", () => ({
  __esModule: true,
  useAnalytics: () => ({
    track: jest.fn(),
  }),
}));

jest.mock("@/components/Providers/FooterTipContext", () => ({
  __esModule: true,
  useFooterTip: () => ({
    currentTip,
    setTip: jest.fn(),
    clearTip: jest.fn(),
  }),
}));

jest.mock("@/hooks/useIsTauriApp", () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock("@/hooks/usePopupState", () => ({
  __esModule: true,
  usePopupState: () => ({
    isOpen: false,
    open: jest.fn(),
    close: jest.fn(),
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => {
      const lookup: Record<string, string> = {
        "actions.help": "Help",
        "actions.about": "About",
        "actions.ok": "OK",
        "ui.madeWith": "Made with",
        "ui.by": "by",
        "tooltip.appVersion": "App version",
        "tooltip.desktopOptimizedNotice": "Desktop optimized",
        "label.desktopOptimized": "Desktop optimized",
        "heading.desktopBrowserRecommended": "Desktop browser recommended",
        "notice.desktopOptimizedBodyPrimary": "Primary notice",
        "notice.desktopOptimizedBodySecondary": "Secondary notice",
      };
      return lookup[key] ?? key;
    },
  }),
}));

jest.mock("@/lib/itch", () => ({
  __esModule: true,
  attachItchBuyButton: jest.fn(),
}));

jest.mock("@/version", () => ({
  APP_VERSION: "0.8.0",
}));

describe("MainFooter footer tip rendering", () => {
  beforeEach(() => {
    currentTip = null;
  });

  it("renders the footer tip in the center when one is published", () => {
    currentTip = mockCurrentTip;

    render(<MainFooter />);

    expect(screen.getByText("Stockpile tip message")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desktop optimized" })).not.toBeInTheDocument();
  });

  it("falls back to the existing center notice slot when there is no footer tip", () => {
    render(<MainFooter />);

    expect(screen.queryByText("Stockpile tip message")).not.toBeInTheDocument();
  });
});
