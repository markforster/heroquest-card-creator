import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import {
  EDITOR_TARGET_IDS,
  EditorTargetsProvider,
  useSvgFocusTarget,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import ContentField from "@/components/Cards/CardInspector/ContentField";
import CopyrightField from "@/components/Cards/CardInspector/CopyrightField";
import HeroStatsInspector from "@/components/Cards/CardInspector/HeroStatsInspector";
import ImageField from "@/components/Cards/CardInspector/ImageField";
import MonsterIconField from "@/components/Cards/CardInspector/MonsterIconField";
import MonsterStatsInspector from "@/components/Cards/CardInspector/MonsterStatsInspector";
import TitleField from "@/components/Cards/CardInspector/TitleField";

jest.mock("@/i18n/I18nProvider", () => ({
  __esModule: true,
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Assets", () => ({
  __esModule: true,
  AssetsModal: () => null,
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
  default: () => <div>COLOR_PICKER</div>,
}));

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({
    defaultCopyright: "Default Copyright",
    isReady: true,
  }),
}));

jest.mock("@/components/common/ModalShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/Cards/CardInspector/FormattingHelpContent", () => ({
  __esModule: true,
  default: () => <div>FORMATTING_HELP</div>,
}));

function SvgHoverProbe({ targetId }: { targetId: (typeof EDITOR_TARGET_IDS)[keyof typeof EDITOR_TARGET_IDS] }) {
  const focusProps = useSvgFocusTarget(targetId);

  return (
    <svg>
      <rect data-testid={`probe-${targetId}`} width="40" height="40" {...focusProps} />
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

function getInspectorTargetNode(container: HTMLElement, targetId: string) {
  return Array.from(container.querySelectorAll(`[data-hqcc-edit="${targetId}"]`)).find((node) =>
    node.hasAttribute("data-hqcc-hovered"),
  );
}

function expectHovered(container: HTMLElement, targetId: string) {
  expect(getInspectorTargetNode(container, targetId)).toHaveAttribute("data-hqcc-hovered", "true");
}

function expectNotHovered(container: HTMLElement, targetId: string) {
  expect(getInspectorTargetNode(container, targetId)).toHaveAttribute(
    "data-hqcc-hovered",
    "false",
  );
}

describe("inspector hover highlights", () => {
  it("highlights coarse field wrappers when the matching SVG targets are hovered", () => {
    const { container } = renderWithForm(
      <>
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.title} />
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.imageMain} />
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.textMain} />
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.imageIcon} />
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.copyright} />
        <TitleField label="Title" />
        <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />
        <ContentField label="Body" />
        <MonsterIconField label="Monster Icon" />
        <CopyrightField label="Copyright" showToggle />
      </>,
      {
        title: "Sir Ragnar",
        name: "Sir Ragnar",
        description: "A brave hero.",
        imageAssetId: "asset-1",
        imageAssetName: "Artwork",
        iconAssetId: "icon-1",
        iconAssetName: "Monster icon",
        copyright: "2026 Mark Forster",
        showCopyright: true,
      },
    );

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.title}`));
    expectHovered(container, EDITOR_TARGET_IDS.title);
    expectNotHovered(container, EDITOR_TARGET_IDS.imageMain);

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.imageMain}`));
    expectHovered(container, EDITOR_TARGET_IDS.imageMain);
    expectNotHovered(container, EDITOR_TARGET_IDS.title);

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.textMain}`));
    expectHovered(container, EDITOR_TARGET_IDS.textMain);
    expectNotHovered(container, EDITOR_TARGET_IDS.imageMain);

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.imageIcon}`));
    expectHovered(container, EDITOR_TARGET_IDS.imageIcon);
    expectNotHovered(container, EDITOR_TARGET_IDS.textMain);

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.copyright}`));
    expectHovered(container, EDITOR_TARGET_IDS.copyright);
    expectNotHovered(container, EDITOR_TARGET_IDS.imageIcon);
  });

  it("does not include the old bottom-margin class on the image field control row", () => {
    const { container } = renderWithForm(
      <ImageField label="Artwork" boundsWidth={100} boundsHeight={100} />,
      {
        imageAssetId: "asset-1",
        imageAssetName: "Artwork",
      },
    );

    const imageWrapper = getInspectorTargetNode(container, EDITOR_TARGET_IDS.imageMain);
    const controlRow = imageWrapper?.querySelector(".input-group.input-group-sm");

    expect(controlRow).toBeInTheDocument();
    expect(controlRow?.className).not.toContain("mb-2");
  });

  it("highlights the coarse stats wrapper without lighting nested stat rows", () => {
    const { container } = renderWithForm(
      <>
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.statsHero} />
        <HeroStatsInspector />
      </>,
      {
        attackDice: 3,
        defendDice: 2,
        bodyPoints: 8,
        mindPoints: 2,
      },
    );

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.statsHero}`));

    expectHovered(container, EDITOR_TARGET_IDS.statsHero);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsHeroAttackDice);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsHeroDefendDice);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsHeroBodyPoints);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsHeroMindPoints);
  });

  it("highlights only the matching nested stat row when a stat cell target is hovered", () => {
    const { container } = renderWithForm(
      <>
        <SvgHoverProbe targetId={EDITOR_TARGET_IDS.statsMonsterBodyPoints} />
        <MonsterStatsInspector />
      </>,
      {
        movementSquares: 7,
        attackDice: 3,
        defendDice: 2,
        bodyPoints: 4,
        mindPoints: 1,
      },
    );

    fireEvent.pointerEnter(screen.getByTestId(`probe-${EDITOR_TARGET_IDS.statsMonsterBodyPoints}`));

    expectHovered(container, EDITOR_TARGET_IDS.statsMonsterBodyPoints);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsMonster);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsMonsterMovementSquares);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsMonsterAttackDice);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsMonsterDefendDice);
    expectNotHovered(container, EDITOR_TARGET_IDS.statsMonsterMindPoints);
  });
});
