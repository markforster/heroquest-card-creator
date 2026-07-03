import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { AssetKind } from "@/api/assets";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useEditorTargets,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import CopyrightField from "@/components/Cards/CardInspector/CopyrightField";
import HeroStatsInspector from "@/components/Cards/CardInspector/HeroStatsInspector";
import ImageField from "@/components/Cards/CardInspector/ImageField";
import MonsterIconField from "@/components/Cards/CardInspector/MonsterIconField";
import TitleField from "@/components/Cards/CardInspector/TitleField";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Assets", () => ({
  __esModule: true,
  AssetsModal: ({
    isOpen,
    preferredKindOrder,
  }: {
    isOpen: boolean;
    preferredKindOrder?: AssetKind[];
  }) =>
    isOpen ? (
      <div>
        {preferredKindOrder?.[0] === "icon" ? "ICON_ASSETS_MODAL_OPEN" : "ARTWORK_ASSETS_MODAL_OPEN"}
      </div>
    ) : null,
}));

jest.mock("@/api/client", () => ({
  apiClient: {
    listAssets: jest.fn(async () => []),
    getAssetObjectUrl: jest.fn(async () => null),
  },
}));

jest.mock("@/components/Providers/PreviewCanvasContext", () => ({
  usePreviewCanvas: () => ({
    renderPreviewCanvas: jest.fn(),
  }),
}));

jest.mock("@/hooks/useSmartSwatches", () => ({
  useSmartSwatches: () => ({
    smartGroups: [],
    isSmartBusy: false,
    requestSmart: jest.fn(),
  }),
}));

jest.mock("@/components/common/ColorPickerField", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div>{isOpen ? "COLOR_PICKER_OPEN" : "COLOR_PICKER_CLOSED"}</div>
  ),
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({
    defaultCopyright: "Default Copyright",
    isReady: true,
  }),
}));

function FocusRequestButton({ targetId }: { targetId: keyof typeof EDITOR_TARGET_IDS }) {
  const { requestFocusTarget } = useEditorTargets();

  return (
    <button type="button" onClick={() => requestFocusTarget(EDITOR_TARGET_IDS[targetId])}>
      focus-{targetId}
    </button>
  );
}

function SecondaryRequestButton({ targetId }: { targetId: keyof typeof EDITOR_TARGET_IDS }) {
  const { requestSecondaryTarget } = useEditorTargets();

  return (
    <button
      type="button"
      onClick={() => requestSecondaryTarget(EDITOR_TARGET_IDS[targetId])}
    >
      secondary-{targetId}
    </button>
  );
}

function SvgTargetProbe({ targetId }: { targetId: keyof typeof EDITOR_TARGET_IDS }) {
  const svgTargetProps = useSvgFocusTarget(EDITOR_TARGET_IDS[targetId]);

  return (
    <svg>
      <rect data-testid={`svg-${targetId}`} width="10" height="10" {...svgTargetProps} />
    </svg>
  );
}

function renderWithForm(ui: React.ReactNode, defaultValues: Record<string, unknown> = {}) {
  function Harness() {
    const methods = useForm({ defaultValues });
    return (
      <EditorTargetsProvider>
        <FormProvider {...methods}>{ui}</FormProvider>
      </EditorTargetsProvider>
    );
  }

  return render(<Harness />);
}

describe("editor target field registration", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
  });

  it("focuses the title field when requested", async () => {
    renderWithForm(
      <>
        <FocusRequestButton targetId="title" />
        <TitleField label="Title" />
      </>,
      { title: "Sir Ragnar", name: "Sir Ragnar" },
    );

    fireEvent.click(screen.getByRole("button", { name: "focus-title" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveFocus();
    });

    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("focuses the image, icon, copyright, and stats controls when requested", async () => {
    renderWithForm(
      <>
        <FocusRequestButton targetId="imageMain" />
        <FocusRequestButton targetId="imageIcon" />
        <FocusRequestButton targetId="copyright" />
        <FocusRequestButton targetId="statsHero" />
        <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />
        <MonsterIconField label="Monster Icon" />
        <CopyrightField label="Copyright" showToggle />
        <HeroStatsInspector />
      </>,
      {
        imageAssetId: "asset-1",
        imageAssetName: "Art",
        iconAssetId: "icon-1",
        iconAssetName: "Icon",
        copyright: "Hero Copyright",
        showCopyright: true,
        attackDice: 3,
        defendDice: 2,
        bodyPoints: 8,
        mindPoints: 2,
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "focus-imageMain" }));
    await waitFor(() => {
      expect(screen.getAllByRole("textbox")[0]).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "focus-imageIcon" }));
    await waitFor(() => {
      expect(screen.getAllByRole("textbox")[1]).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "focus-copyright" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Hero Copyright")).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "focus-statsHero" }));
    await waitFor(() => {
      expect(screen.getByDisplayValue("3")).toHaveFocus();
    });
  });

  it("runs registered secondary actions when requested directly", async () => {
    renderWithForm(
      <>
        <SecondaryRequestButton targetId="title" />
        <SecondaryRequestButton targetId="imageMain" />
        <SecondaryRequestButton targetId="imageIcon" />
        <TitleField label="Title" showTitleColor />
        <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />
        <MonsterIconField label="Monster Icon" />
      </>,
      {
        title: "Sir Ragnar",
        name: "Sir Ragnar",
        imageAssetId: "asset-1",
        imageAssetName: "Art",
        iconAssetId: "icon-1",
        iconAssetName: "Icon",
      },
    );

    expect(screen.getByText("COLOR_PICKER_CLOSED")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "secondary-title" }));
    await waitFor(() => {
      expect(screen.getByText("COLOR_PICKER_OPEN")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "secondary-imageMain" }));
    await waitFor(() => {
      expect(screen.getByText("ARTWORK_ASSETS_MODAL_OPEN")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "secondary-imageIcon" }));
    await waitFor(() => {
      expect(screen.getByText("ICON_ASSETS_MODAL_OPEN")).toBeInTheDocument();
    });
  });

  it("routes svg double click through the registered secondary action", async () => {
    renderWithForm(
      <>
        <SvgTargetProbe targetId="imageMain" />
        <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />
      </>,
      {
        imageAssetId: "asset-1",
        imageAssetName: "Art",
      },
    );

    fireEvent.doubleClick(screen.getByTestId("svg-imageMain"));

    await waitFor(() => {
      expect(screen.getByText("ARTWORK_ASSETS_MODAL_OPEN")).toBeInTheDocument();
    });
  });
});
