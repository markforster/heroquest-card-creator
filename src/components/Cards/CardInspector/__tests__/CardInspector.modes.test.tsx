import { fireEvent, render, screen } from "@testing-library/react";

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
        "label.decksView": "Decks",
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock("@/components/Cards/CardInspector/GenericInspectorForm", () => ({
  __esModule: true,
  default: () => <div>FORM_PANEL</div>,
}));

jest.mock("@/components/Cards/CardInspector/PairingInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>PAIRING_PANEL</div>,
}));

jest.mock("@/components/Cards/CardInspector/DecksInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>DECKS_PANEL</div>,
}));

import CardInspector from "@/components/Cards/CardInspector/CardInspector";

describe("CardInspector modes", () => {
  beforeEach(() => {
    mockUseCardEditor.mockReset();
  });

  it("renders inspector mode tabs and toggles panels", () => {
    mockUseCardEditor.mockReturnValue({
      state: {
        selectedTemplateId: "hero",
        activeCardIdByTemplate: { hero: "card-1" },
      },
    });

    render(<CardInspector />);

    expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Properties")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Decks" }));
    expect(screen.getByText("DECKS_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Decks")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Pairing" }));
    expect(screen.getByText("PAIRING_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Pairing")).toBeInTheDocument();
  });
});
