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
        "label.collections": "Collections",
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

jest.mock("@/components/Cards/CardInspector/CollectionsInspectorPanel", () => ({
  __esModule: true,
  default: () => <div>COLLECTIONS_PANEL</div>,
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

    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Properties",
      "Pairing",
      "Collections",
      "Decks",
    ]);
    expect(screen.getByText("FORM_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Properties")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Collections" }));
    expect(screen.getByText("COLLECTIONS_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Collections")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Decks" }));
    expect(screen.getByText("DECKS_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Decks")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Pairing" }));
    expect(screen.getByText("PAIRING_PANEL")).toBeInTheDocument();
    expect(screen.getByText("Pairing")).toBeInTheDocument();
  });
});
