import { fireEvent, render, screen } from "@testing-library/react";

import BodyTextEmojiPicker from "@/components/Cards/CardInspector/BodyTextEmojiPicker";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

function MockEmojiPicker({
  onEmojiClick,
  className,
  theme,
  searchDisabled,
  skinTonesDisabled,
  previewConfig,
}: {
  onEmojiClick: (emoji: { emoji: string }) => void;
  className?: string;
  theme: string;
  searchDisabled?: boolean;
  skinTonesDisabled?: boolean;
  previewConfig?: { showPreview?: boolean };
}) {
  return (
    <div data-testid="emoji-picker" data-class-name={className} data-theme={theme}>
      <button
        type="button"
        data-testid="emoji-click"
        data-search-disabled={String(Boolean(searchDisabled))}
        data-skin-tones-disabled={String(Boolean(skinTonesDisabled))}
        data-preview-hidden={String(previewConfig?.showPreview === false)}
        onClick={() => onEmojiClick({ emoji: "😀" })}
      >
        pick
      </button>
    </div>
  );
}

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => unknown) => {
    void loader;
    return MockEmojiPicker;
  },
}));

jest.mock("emoji-picker-react", () => ({
  __esModule: true,
  EmojiStyle: {
    NATIVE: "native",
  },
  Theme: {
    DARK: "dark",
    LIGHT: "light",
    AUTO: "auto",
  },
}));

jest.mock("emoji-picker-react/dist/data/emojis-en", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-da", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-de", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-en-gb", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-es", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-fi", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-fr", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-hu", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-it", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-nb", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-nl", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-pl", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-pt", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-ru", () => ({ __esModule: true, default: {} }));
jest.mock("emoji-picker-react/dist/data/emojis-sv", () => ({ __esModule: true, default: {} }));

function renderPicker(theme: "dark" | "light" = "dark", onInsert = jest.fn()) {
  window.localStorage.setItem("hqcc.theme", theme);

  return {
    onInsert,
    ...render(
      <I18nProvider>
        <LocalStorageProvider>
          <ThemeProvider>
            <BodyTextEmojiPicker onInsert={onInsert} />
          </ThemeProvider>
        </LocalStorageProvider>
      </I18nProvider>,
    ),
  };
}

describe("BodyTextEmojiPicker", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("renders the picker with the resolved dark theme and scoped class", () => {
    renderPicker("dark");

    fireEvent.click(screen.getByLabelText("Insert emoji"));

    expect(screen.getByTestId("emoji-picker")).toHaveAttribute("data-theme", "dark");
    expect(screen.getByTestId("emoji-picker")).toHaveAttribute(
      "data-class-name",
      expect.stringContaining("bodyTextEmojiPicker"),
    );
    expect(screen.getByTestId("emoji-click")).toHaveAttribute("data-search-disabled", "true");
    expect(screen.getByTestId("emoji-click")).toHaveAttribute("data-skin-tones-disabled", "true");
    expect(screen.getByTestId("emoji-click")).toHaveAttribute("data-preview-hidden", "true");
  });

  it("renders the picker with the resolved light theme", () => {
    renderPicker("light");

    fireEvent.click(screen.getByLabelText("Insert emoji"));

    expect(screen.getByTestId("emoji-picker")).toHaveAttribute("data-theme", "light");
  });

  it("inserts an emoji and closes the popover", () => {
    const { onInsert } = renderPicker();

    fireEvent.click(screen.getByLabelText("Insert emoji"));
    fireEvent.click(screen.getByTestId("emoji-click"));

    expect(onInsert).toHaveBeenCalledWith("😀");
    expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
  });
});
