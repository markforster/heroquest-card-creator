import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import GlobalAppShortcuts from "@/components/App/GlobalAppShortcuts";

const openRecent = jest.fn();
const openSettings = jest.fn();
const openTemplatePicker = jest.fn();
const focusPrimarySearch = jest.fn();
const routeShortcutE = jest.fn();

const appActionsState = {
  openRecent,
  openSettings,
  openTemplatePicker,
  isAssetsOpen: false,
  isRecentOpen: false,
  isSettingsOpen: false,
  isStockpileOpen: false,
  isTemplatePickerOpen: false,
};

jest.mock("@/components/Providers/AppActionsContext", () => ({
  __esModule: true,
  useAppActions: () => appActionsState,
}));

jest.mock("@/components/App/RouteShellCapabilitiesContext", () => ({
  __esModule: true,
  useRouteShellCapabilities: () => ({
    repairCurrentCardThumbnail: jest.fn(),
    focusPrimarySearch,
    routeShortcutHandlers: {
      e: routeShortcutE,
    },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSubject() {
  return render(
    <MemoryRouter initialEntries={["/cards"]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <GlobalAppShortcuts />
              <LocationProbe />
              <input aria-label="Editable input" />
              <div data-testid="editable-div" contentEditable suppressContentEditableWarning>
                editable
              </div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GlobalAppShortcuts (UI)", () => {
  beforeEach(() => {
    openRecent.mockReset();
    openSettings.mockReset();
    openTemplatePicker.mockReset();
    focusPrimarySearch.mockReset().mockReturnValue(true);
    routeShortcutE.mockReset().mockReturnValue(true);
    appActionsState.isAssetsOpen = false;
    appActionsState.isRecentOpen = false;
    appActionsState.isSettingsOpen = false;
    appActionsState.isStockpileOpen = false;
    appActionsState.isTemplatePickerOpen = false;
  });

  it("routes and opens global app actions from bare keys", () => {
    renderSubject();

    fireEvent.keyDown(window, { key: "r" });
    fireEvent.keyDown(window, { key: "q" });
    fireEvent.keyDown(window, { key: "n" });
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByTestId("location")).toHaveTextContent("/decks");

    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByTestId("location")).toHaveTextContent("/assets");

    fireEvent.keyDown(window, { key: "c" });
    fireEvent.keyDown(window, { key: "s" });
    fireEvent.keyDown(window, { key: "e" });

    expect(openRecent).toHaveBeenCalledTimes(1);
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(openTemplatePicker).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/cards");
    expect(focusPrimarySearch).toHaveBeenCalledTimes(1);
    expect(routeShortcutE).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts from editable targets and when modifiers or repeats are present", () => {
    renderSubject();
    const editableDiv = screen.getByTestId("editable-div");
    Object.defineProperty(editableDiv, "isContentEditable", {
      configurable: true,
      value: true,
    });

    fireEvent.keyDown(screen.getByLabelText("Editable input"), { key: "r" });
    editableDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
    fireEvent.keyDown(window, { key: "n", altKey: true });
    fireEvent.keyDown(window, { key: "d", metaKey: true });
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyDown(window, { key: "s", repeat: true });
    fireEvent.keyDown(window, { key: "e", shiftKey: true });

    expect(openRecent).not.toHaveBeenCalled();
    expect(openSettings).not.toHaveBeenCalled();
    expect(openTemplatePicker).not.toHaveBeenCalled();
    expect(focusPrimarySearch).not.toHaveBeenCalled();
    expect(routeShortcutE).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("/cards");
  });

  it("suppresses global shortcuts while app-level transient UI is open", () => {
    const view = renderSubject();
    appActionsState.isSettingsOpen = true;

    view.rerender(
      <MemoryRouter initialEntries={["/cards"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <GlobalAppShortcuts />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.keyDown(window, { key: "r" });
    fireEvent.keyDown(window, { key: "n" });
    fireEvent.keyDown(window, { key: "d" });
    fireEvent.keyDown(window, { key: "s" });
    fireEvent.keyDown(window, { key: "e" });

    expect(openRecent).not.toHaveBeenCalled();
    expect(openTemplatePicker).not.toHaveBeenCalled();
    expect(focusPrimarySearch).not.toHaveBeenCalled();
    expect(routeShortcutE).not.toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("/cards");
  });
});
