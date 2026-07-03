import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
  useInspectorTargetRegistration,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import CardInspector from "@/components/Cards/CardInspector/CardInspector";

const mockUseCardEditor = jest.fn();

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => mockUseCardEditor(),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "empty.selectTemplate": "Select template",
        "tooltip.inspectorMode": "Switch inspector mode",
        "label.formView": "Properties",
        "label.pairingView": "Pairing",
        "label.collections": "Collections",
        "label.decksView": "Decks",
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock("@/components/Cards/CardInspector/PairingInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>PAIRING_PANEL</div>,
}));

jest.mock("@/components/Cards/CardInspector/CollectionsInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>COLLECTIONS_PANEL</div>,
}));

jest.mock("@/components/Cards/CardInspector/DecksInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>DECKS_PANEL</div>,
}));

jest.mock("@/components/Cards/CardInspector/GenericInspectorForm", () => ({
  __esModule: true,
  default: function MockGenericInspectorForm() {
    const fieldRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const handleFieldFocusCapture = useInspectorTargetRegistration({
      targetId: EDITOR_TARGET_IDS.title,
      containerRef: fieldRef,
      focusRef: inputRef,
    });

    React.useLayoutEffect(() => {
      const field = fieldRef.current;
      if (field) {
        field.getBoundingClientRect = () =>
          ({
            top: 140,
            bottom: 240,
            left: 0,
            right: 320,
            width: 320,
            height: 100,
            x: 0,
            y: 140,
            toJSON: () => ({}),
          }) as DOMRect;
      }

      const input = inputRef.current;
      if (input) {
        const nativeFocus = HTMLElement.prototype.focus;
        input.focus = ((options?: FocusOptions) => {
          (input as HTMLInputElement & { __lastFocusOptions?: FocusOptions }).__lastFocusOptions =
            options;
          nativeFocus.call(input);
        }) as typeof input.focus;
      }
    }, []);

    return (
      <div
        ref={fieldRef}
        data-testid="registered-target"
        onFocusCapture={handleFieldFocusCapture}
      >
        FORM_PANEL
        <input ref={inputRef} aria-label="Title input" />
      </div>
    );
  },
}));

function FocusTrigger() {
  const { beginHoverTarget, endHoverTarget, requestFocusTarget, requestRevealTarget } =
    useEditorTargets();

  return (
    <>
      <button
        type="button"
        onClick={() => requestFocusTarget(EDITOR_TARGET_IDS.title)}
      >
        Trigger focus
      </button>
      <button
        type="button"
        onClick={() => requestRevealTarget(EDITOR_TARGET_IDS.title)}
      >
        Trigger reveal
      </button>
      <button
        type="button"
        onPointerEnter={() => beginHoverTarget(EDITOR_TARGET_IDS.title)}
        onPointerLeave={() => endHoverTarget(EDITOR_TARGET_IDS.title)}
      >
        Hover title
      </button>
      <button
        type="button"
        onPointerEnter={() => beginHoverTarget(EDITOR_TARGET_IDS.imageMain)}
        onPointerLeave={() => endHoverTarget(EDITOR_TARGET_IDS.imageMain)}
      >
        Hover other
      </button>
    </>
  );
}

type ScrollScenario = {
  scrollContainer: HTMLElement;
  scrollToMock: jest.Mock;
};

function configureScrollScenario(): ScrollScenario {
  const scrollContainer = document.querySelector(
    '[data-hqcc-inspector-scroll-container="true"]',
  ) as HTMLElement;
  const scrollToMock = jest.fn(({ top }: { top: number }) => {
    scrollContainer.scrollTop = top;
  });

  Object.defineProperty(scrollContainer, "clientHeight", {
    configurable: true,
    value: 160,
  });
  Object.defineProperty(scrollContainer, "scrollHeight", {
    configurable: true,
    value: 640,
  });
  Object.defineProperty(scrollContainer, "scrollTop", {
    configurable: true,
    writable: true,
    value: 0,
  });
  Object.defineProperty(scrollContainer, "scrollTo", {
    configurable: true,
    value: scrollToMock,
  });

  scrollContainer.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: 160,
      left: 0,
      right: 320,
      width: 320,
      height: 160,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  return { scrollContainer, scrollToMock };
}

describe("CardInspector focus target coordination", () => {
  beforeEach(() => {
    jest.useRealTimers();
    mockUseCardEditor.mockReset();
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
      },
    });
  });

  it("switches to form mode, reveals the wrapper, and focuses the requested field", async () => {
    render(
      <EditorTargetsProvider>
        <FocusTrigger />
        <CardInspector />
      </EditorTargetsProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();

    const { scrollToMock } = configureScrollScenario();

    fireEvent.click(screen.getByRole("button", { name: "Trigger focus" }));

    await waitFor(() => {
      expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
      expect(screen.getByLabelText("Title input")).toHaveFocus();
    });

    const input = screen.getByLabelText("Title input") as HTMLInputElement & {
      __lastFocusOptions?: FocusOptions;
    };
    expect(scrollToMock).toHaveBeenCalledWith({ top: 88, behavior: "smooth" });
    expect(input.__lastFocusOptions).toEqual({ preventScroll: true });
  });

  it("switches to form mode and reveals the wrapper without focusing on reveal requests", async () => {
    render(
      <EditorTargetsProvider>
        <FocusTrigger />
        <CardInspector />
      </EditorTargetsProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();

    const { scrollToMock } = configureScrollScenario();

    fireEvent.click(screen.getByRole("button", { name: "Trigger reveal" }));

    await waitFor(() => {
      expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
      expect(scrollToMock).toHaveBeenCalledWith({ top: 88, behavior: "smooth" });
    });

    const input = screen.getByLabelText("Title input");
    expect(input).not.toHaveFocus();
  });

  it("reveals after 3 seconds of hover without focusing", async () => {
    jest.useFakeTimers();

    render(
      <EditorTargetsProvider>
        <FocusTrigger />
        <CardInspector />
      </EditorTargetsProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();

    const { scrollToMock } = configureScrollScenario();

    fireEvent.pointerEnter(screen.getByRole("button", { name: "Hover title" }));
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(screen.queryByText("FORM_PANEL")).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
      expect(scrollToMock).toHaveBeenCalledWith({ top: 88, behavior: "smooth" });
    });

    const input = screen.getByLabelText("Title input");
    expect(input).not.toHaveFocus();
  });

  it("cancels pending hover reveal when leaving or switching targets", async () => {
    jest.useFakeTimers();

    render(
      <EditorTargetsProvider>
        <FocusTrigger />
        <CardInspector />
      </EditorTargetsProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();

    configureScrollScenario();

    const titleHover = screen.getByRole("button", { name: "Hover title" });
    const otherHover = screen.getByRole("button", { name: "Hover other" });

    fireEvent.pointerEnter(titleHover);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.pointerLeave(titleHover);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("FORM_PANEL")).not.toBeInTheDocument();

    fireEvent.pointerEnter(titleHover);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.pointerEnter(otherHover);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("FORM_PANEL")).not.toBeInTheDocument();
  });
});
