import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
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
  default: () => {
    const { registerFocusTarget } = useEditorTargets();
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      return registerFocusTarget(EDITOR_TARGET_IDS.title, () => {
        inputRef.current?.scrollIntoView({ block: "nearest" });
        inputRef.current?.focus();
      });
    }, [registerFocusTarget]);

    return (
      <div>
        FORM_PANEL
        <input ref={inputRef} aria-label="Title input" />
      </div>
    );
  },
}));

function FocusTrigger() {
  const { requestFocusTarget } = useEditorTargets();

  return (
    <button type="button" onClick={() => requestFocusTarget(EDITOR_TARGET_IDS.title)}>
      Trigger focus
    </button>
  );
}

describe("CardInspector focus target coordination", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
    mockUseCardEditor.mockReset();
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
      },
    });
  });

  it("switches to form mode and focuses the requested field", async () => {
    render(
      <EditorTargetsProvider>
        <FocusTrigger />
        <CardInspector />
      </EditorTargetsProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trigger focus" }));

    await waitFor(() => {
      expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
      expect(screen.getByLabelText("Title input")).toHaveFocus();
    });

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
