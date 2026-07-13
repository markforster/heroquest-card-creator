"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { createRef, forwardRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import CardPreviewContainer from "@/components/Cards/CardEditor/CardPreviewContainer";
import { EditorTargetsProvider } from "@/components/Cards/CardEditor/EditorTargetsContext";

const mockListPairs = jest.fn();
const mockListCards = jest.fn();
const mockGetCard = jest.fn();

let mockFace: "front" | "back" = "front";

jest.mock("@/components/Cards/CardPreview", () => ({
  __esModule: true,
  default: forwardRef(function MockCardPreview(
    props: { cardData?: { title?: string } },
    _ref,
  ) {
    void _ref;
    return <div>{props.cardData?.title ?? "NO_TITLE"}</div>;
  }),
}));

jest.mock("@/components/Cards/CardPreview/WebglPreview", () => ({
  __esModule: true,
  default: () => <div>WEBGL_PREVIEW</div>,
}));

jest.mock("@/components/Providers/CardEditorContext", () => ({
  useCardEditor: () => ({
    state: {
      selectedTemplateId: "hero",
      activeCardIdByTemplate: { hero: "active-card" },
    },
  }),
}));

jest.mock("@/components/Providers/DebugVisualsContext", () => ({
  useDebugVisuals: () => ({
    showTextBounds: false,
  }),
}));

jest.mock("@/components/Providers/PreviewRendererContext", () => ({
  usePreviewRenderer: () => ({
    previewRenderer: "webgl",
    rotationResetToken: 0,
    recenterToken: 0,
  }),
}));

jest.mock("@/components/Providers/TextFittingPreferencesContext", () => ({
  useTextFittingPreferences: () => ({
    preferences: {},
    isDragging: false,
  }),
}));

jest.mock("@/components/Stockpile/stockpile-utils", () => ({
  waitForAssetElements: jest.fn(async () => undefined),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    language: "en",
    t: (key: string) => key,
  }),
}));

jest.mock("@/i18n/getTemplateNameLabel", () => ({
  getTemplateNameLabel: () => "Hero",
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listPairs: (...args: unknown[]) => mockListPairs(...args),
    getCard: (...args: unknown[]) => mockGetCard(...args),
    listCards: (...args: unknown[]) => mockListCards(...args),
  },
}));

function Harness({ preferredBackId }: { preferredBackId?: string | null }) {
  const form = useForm({
    defaultValues: {
      face: mockFace,
      title: "Active card",
    },
  });

  return (
    <EditorTargetsProvider>
      <FormProvider {...form}>
        <CardPreviewContainer previewRef={createRef()} preferredBackId={preferredBackId} />
      </FormProvider>
    </EditorTargetsProvider>
  );
}

describe("CardPreviewContainer paired face resolution", () => {
  beforeEach(() => {
    mockFace = "front";
    mockListPairs.mockReset();
    mockListCards.mockReset();
    mockGetCard.mockReset();
    mockListPairs.mockResolvedValue([]);
    mockListCards.mockResolvedValue([]);
    mockGetCard.mockResolvedValue(null);
  });

  it("uses the most recently viewed paired back when no remembered back exists", async () => {
    mockListPairs.mockResolvedValue([
      { id: "pair-1", frontFaceId: "active-card", backFaceId: "back-1" },
      { id: "pair-2", frontFaceId: "active-card", backFaceId: "back-2" },
    ]);
    mockListCards.mockResolvedValue([
      {
        id: "back-1",
        templateId: "hero",
        status: "saved",
        name: "Back 1",
        nameLower: "back 1",
        createdAt: 1,
        updatedAt: 10,
        lastViewedAt: 50,
        schemaVersion: 2,
        title: "Back One",
      },
      {
        id: "back-2",
        templateId: "hero",
        status: "saved",
        name: "Back 2",
        nameLower: "back 2",
        createdAt: 1,
        updatedAt: 20,
        lastViewedAt: 100,
        schemaVersion: 2,
        title: "Back Two",
      },
    ]);
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => {
      return params.id === "back-2"
        ? {
            id: "back-2",
            templateId: "hero",
            status: "saved",
            name: "Back 2",
            nameLower: "back 2",
            createdAt: 1,
            updatedAt: 20,
            lastViewedAt: 100,
            schemaVersion: 2,
            title: "Back Two",
          }
        : null;
    });

    render(<Harness preferredBackId={null} />);

    await waitFor(() => {
      expect(screen.getAllByText("Back Two")).toHaveLength(1);
    });
    expect(mockGetCard).toHaveBeenCalledWith({ params: { id: "back-2" } });
  });

  it("prefers the remembered paired back when it is still valid", async () => {
    mockListPairs.mockResolvedValue([
      { id: "pair-1", frontFaceId: "active-card", backFaceId: "back-1" },
      { id: "pair-2", frontFaceId: "active-card", backFaceId: "back-2" },
    ]);
    mockListCards.mockResolvedValue([
      {
        id: "back-1",
        templateId: "hero",
        status: "saved",
        name: "Back 1",
        nameLower: "back 1",
        createdAt: 1,
        updatedAt: 10,
        lastViewedAt: 50,
        schemaVersion: 2,
        title: "Back One",
      },
      {
        id: "back-2",
        templateId: "hero",
        status: "saved",
        name: "Back 2",
        nameLower: "back 2",
        createdAt: 1,
        updatedAt: 20,
        lastViewedAt: 100,
        schemaVersion: 2,
        title: "Back Two",
      },
    ]);
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => {
      return params.id === "back-1"
        ? {
            id: "back-1",
            templateId: "hero",
            status: "saved",
            name: "Back 1",
            nameLower: "back 1",
            createdAt: 1,
            updatedAt: 10,
            lastViewedAt: 50,
            schemaVersion: 2,
            title: "Back One",
          }
        : null;
    });

    render(<Harness preferredBackId="back-1" />);

    await waitFor(() => {
      expect(screen.getAllByText("Back One")).toHaveLength(1);
    });
    expect(mockGetCard).toHaveBeenCalledWith({ params: { id: "back-1" } });
  });

  it("resolves a paired front for back-face editing", async () => {
    mockFace = "back";
    mockListPairs.mockResolvedValue([
      { id: "pair-1", frontFaceId: "front-1", backFaceId: "active-card" },
      { id: "pair-2", frontFaceId: "front-2", backFaceId: "active-card" },
    ]);
    mockListCards.mockResolvedValue([
      {
        id: "front-1",
        templateId: "hero",
        status: "saved",
        name: "Front 1",
        nameLower: "front 1",
        createdAt: 1,
        updatedAt: 10,
        lastViewedAt: 20,
        schemaVersion: 2,
      },
      {
        id: "front-2",
        templateId: "hero",
        status: "saved",
        name: "Front 2",
        nameLower: "front 2",
        createdAt: 1,
        updatedAt: 20,
        lastViewedAt: 80,
        schemaVersion: 2,
      },
    ]);
    mockGetCard.mockImplementation(async ({ params }: { params: { id: string } }) => {
      if (params.id !== "front-2") return null;
      return {
        id: "front-2",
        templateId: "hero",
        status: "saved",
        name: "Front 2",
        nameLower: "front 2",
        createdAt: 1,
        updatedAt: 20,
        lastViewedAt: 80,
        schemaVersion: 2,
        title: "Front Two",
      };
    });

    render(<Harness preferredBackId={null} />);

    await waitFor(() => {
      expect(screen.getAllByText("Front Two")).toHaveLength(1);
    });
    expect(mockGetCard).toHaveBeenCalledWith({ params: { id: "front-2" } });
  });
});
