import { fireEvent, render, screen } from "@testing-library/react";

import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import {
  TYPOGRAPHY_NUMERIC_STORAGE_KEYS,
  useTypographyNumericSettings,
} from "@/lib/typography-settings";

function Harness() {
  const {
    titleAlignedNumerals,
    setTitleAlignedNumerals,
    titleFixedWidthNumerals,
    setTitleFixedWidthNumerals,
    statAlignedNumerals,
    setStatAlignedNumerals,
    statFixedWidthNumerals,
    setStatFixedWidthNumerals,
  } = useTypographyNumericSettings();

  return (
    <div>
      <div data-testid="titleAligned">{String(titleAlignedNumerals)}</div>
      <div data-testid="titleFixed">{String(titleFixedWidthNumerals)}</div>
      <div data-testid="statAligned">{String(statAlignedNumerals)}</div>
      <div data-testid="statFixed">{String(statFixedWidthNumerals)}</div>
      <button type="button" onClick={() => setTitleAlignedNumerals(false)}>
        disable title aligned
      </button>
      <button type="button" onClick={() => setTitleFixedWidthNumerals(false)}>
        disable title fixed
      </button>
      <button type="button" onClick={() => setStatAlignedNumerals(false)}>
        disable stat aligned
      </button>
      <button type="button" onClick={() => setStatFixedWidthNumerals(false)}>
        disable stat fixed
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <LocalStorageProvider>
      <Harness />
    </LocalStorageProvider>,
  );
}

describe("useTypographyNumericSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults missing settings to true", () => {
    renderHarness();

    expect(screen.getByTestId("titleAligned")).toHaveTextContent("true");
    expect(screen.getByTestId("titleFixed")).toHaveTextContent("true");
    expect(screen.getByTestId("statAligned")).toHaveTextContent("true");
    expect(screen.getByTestId("statFixed")).toHaveTextContent("true");
  });

  it("respects stored boolean values and persists updates", () => {
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleAlignedNumerals, "0");
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.titleFixedWidthNumerals, "false");
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statAlignedNumerals, "1");
    window.localStorage.setItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals, "true");

    renderHarness();

    expect(screen.getByTestId("titleAligned")).toHaveTextContent("false");
    expect(screen.getByTestId("titleFixed")).toHaveTextContent("false");
    expect(screen.getByTestId("statAligned")).toHaveTextContent("true");
    expect(screen.getByTestId("statFixed")).toHaveTextContent("true");

    fireEvent.click(screen.getByRole("button", { name: "disable stat fixed" }));

    expect(window.localStorage.getItem(TYPOGRAPHY_NUMERIC_STORAGE_KEYS.statFixedWidthNumerals)).toBe(
      "0",
    );
    expect(screen.getByTestId("statFixed")).toHaveTextContent("false");
  });
});
