"use client";

import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import PairingInspectorPanel from "@/components/Cards/CardInspector/PairingInspectorPanel";

const mockNavigate = jest.fn();
const mockOpenStockpile = jest.fn();
const mockUseCardEditor = jest.fn();
const mockListCards = jest.fn();
const mockListPairs = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listCards: (...args: unknown[]) => mockListCards(...args),
    listPairs: (...args: unknown[]) => mockListPairs(...args),
    createPair: jest.fn(),
    deletePair: jest.fn(),
  },
}));

jest.mock("@/components/App/UnsavedChangesGuardContext", () => ({
  useUnsavedChangesGuardControls: () => ({
    bypassNextNavigation: jest.fn(),
    runWithUnsavedChangesGuard: (callback: () => void | Promise<void>) => callback(),
  }),
}));

jest.mock("@/components/Providers/AppActionsContext", () => ({
  useAppActions: () => ({
    openStockpile: (...args: unknown[]) => mockOpenStockpile(...args),
  }),
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => mockUseCardEditor(),
}));

jest.mock("@/components/Providers/EditorSaveContext", () => ({
  useEditorSave: () => ({
    saveToken: 0,
  }),
}));

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    requestRecenter: jest.fn(),
  }),
}));

jest.mock("@/lib/card-thumbnail-cache", () => ({
  useCardThumbnailUrl: () => null,
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "label.untitledCard": "Untitled card",
        "cardFace.unpaired": "Unpaired",
        "tooltip.saveBeforePairing": "Save the card before managing pairings",
        "tooltip.pairBack": "Pair with a back card",
        "tooltip.managePairings": "Manage paired fronts",
        "empty.saveCardToManagePairingsTitle": "Save this card to manage pairings",
        "empty.saveCardToManagePairingsBody":
          "Pairings are attached to saved cards, so this card needs to be saved before links can be managed here.",
        "empty.saveCardToManagePairingsHint":
          "After saving, use the pairing button to link this card to its matching front or back face.",
        "empty.noBackPairingsTitle": "No pairings yet",
        "empty.noBackPairingsBody": "This card is currently unpaired on its front face.",
        "empty.noBackPairingsHint":
          "Use the pairing button above to link it to one or more back cards.",
        "empty.noFrontPairingsTitle": "No front cards paired yet",
        "empty.noFrontPairingsBody":
          "No front-facing cards are currently linked to this back face.",
        "empty.noFrontPairingsHint":
          "Use the pairing button above to manage which front cards connect to this back card.",
      };
      return map[key] ?? key;
    },
  }),
}));

function Harness({
  face,
  activeCardId = "card-1",
}: {
  face: "front" | "back";
  activeCardId?: string | undefined;
}) {
  const form = useForm({
    defaultValues: {
      face,
    },
  });

  mockUseCardEditor.mockReturnValue({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: { hero: activeCardId },
    },
  });

  return (
    <FormProvider {...form}>
      <PairingInspectorPanel />
    </FormProvider>
  );
}

describe("PairingInspectorPanel empty states", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenStockpile.mockReset();
    mockUseCardEditor.mockReset();
    mockListCards.mockReset();
    mockListPairs.mockReset();
    mockListCards.mockResolvedValue([]);
    mockListPairs.mockResolvedValue([]);
  });

  it("shows a front-face empty notice when no back pairings exist", async () => {
    render(<Harness face="front" />);

    expect(await screen.findByText("No pairings yet")).toBeInTheDocument();
    expect(
      screen.getByText("This card is currently unpaired on its front face."),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Pair with a back card")).toBeInTheDocument();
  });

  it("shows a back-face empty notice when no front pairings exist", async () => {
    render(<Harness face="back" />);

    expect(await screen.findByText("No front cards paired yet")).toBeInTheDocument();
    expect(
      screen.getByText("No front-facing cards are currently linked to this back face."),
    ).toBeInTheDocument();
    expect(screen.getByTitle("Manage paired fronts")).toBeInTheDocument();
  });
});
