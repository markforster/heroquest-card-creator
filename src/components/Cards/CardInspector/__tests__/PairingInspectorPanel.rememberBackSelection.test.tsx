"use client";

import { fireEvent, render, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import PairingInspectorPanel from "@/components/Cards/CardInspector/PairingInspectorPanel";

const mockNavigate = jest.fn();
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
    openStockpile: jest.fn(),
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
    t: (key: string) => key,
  }),
}));

function Harness({ onRememberBackId }: { onRememberBackId: (backId: string) => void }) {
  const form = useForm({
    defaultValues: {
      face: "front",
    },
  });

  mockUseCardEditor.mockReturnValue({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: { hero: "front-current" },
    },
  });

  return (
    <FormProvider {...form}>
      <PairingInspectorPanel onRememberBackId={onRememberBackId} autoOpenBackId="back-2" />
    </FormProvider>
  );
}

describe("PairingInspectorPanel remembered back selection", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((message?: unknown) => {
      if (
        typeof message === "string" &&
        message.includes("validateDOMNesting(...): <button> cannot appear as a descendant of <button>")
      ) {
        return;
      }
    });
    mockNavigate.mockReset();
    mockUseCardEditor.mockReset();
    mockListCards.mockReset();
    mockListPairs.mockReset();
    mockListCards.mockResolvedValue([
      {
        id: "back-2",
        templateId: "hero",
        status: "saved",
        name: "Back Two",
        nameLower: "back two",
        createdAt: 1,
        updatedAt: 30,
        lastViewedAt: 50,
        schemaVersion: 2,
        title: "Back Two",
      },
      {
        id: "front-target",
        templateId: "hero",
        status: "saved",
        name: "Front Target",
        nameLower: "front target",
        createdAt: 1,
        updatedAt: 10,
        lastViewedAt: 20,
        schemaVersion: 2,
        title: "Front Target",
      },
    ]);
    mockListPairs.mockImplementation(async ({ queries }: { queries: { faceId: string } }) => {
      if (queries.faceId === "front-current") {
        return [{ id: "pair-a", frontFaceId: "front-current", backFaceId: "back-2" }];
      }
      if (queries.faceId === "back-2") {
        return [
          { id: "pair-a", frontFaceId: "front-current", backFaceId: "back-2" },
          { id: "pair-b", frontFaceId: "front-target", backFaceId: "back-2" },
        ];
      }
      return [];
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("remembers the back id when a grouped front is opened", async () => {
    const onRememberBackId = jest.fn();

    const { container } = render(<Harness onRememberBackId={onRememberBackId} />);

    await waitFor(() => {
      expect(container.querySelector(".pairingPanelGroupGrid button")).toBeTruthy();
    });

    const frontButton = container.querySelector(".pairingPanelGroupGrid button");

    fireEvent.click(frontButton as HTMLButtonElement);

    expect(onRememberBackId).toHaveBeenCalledWith("back-2");
    expect(mockNavigate).toHaveBeenCalledWith("/cards/front-target");
  });
});
