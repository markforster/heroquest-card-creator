import { render } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

type MockContentFieldProps = {
  label?: string;
  showBodyTextFitToggle?: boolean;
};

const mockContentField = jest.fn<JSX.Element, [MockContentFieldProps]>(() => <div>CONTENT_FIELD</div>);

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Cards/CardInspector/TitleField", () => ({
  __esModule: true,
  default: () => <div>TITLE_FIELD</div>,
}));

jest.mock("@/components/Cards/CardInspector/ContentField", () => ({
  __esModule: true,
  default: (props: MockContentFieldProps) => mockContentField(props),
}));

jest.mock("@/components/Cards/CardInspector/HeroStatsInspector", () => ({
  __esModule: true,
  default: () => <div>HERO_STATS</div>,
}));

jest.mock("@/components/Cards/CardInspector/MonsterStatsInspector", () => ({
  __esModule: true,
  default: () => <div>MONSTER_STATS</div>,
}));

jest.mock("@/components/Cards/CardInspector/ImageField", () => ({
  __esModule: true,
  default: () => <div>IMAGE_FIELD</div>,
}));

jest.mock("@/components/Cards/CardInspector/BorderColorField", () => ({
  __esModule: true,
  default: () => <div>BORDER_COLOR</div>,
}));

jest.mock("@/components/Cards/CardInspector/BackgroundTintField", () => ({
  __esModule: true,
  default: () => <div>BACKGROUND_TINT</div>,
}));

jest.mock("@/components/Cards/CardInspector/MonsterIconField", () => ({
  __esModule: true,
  default: () => <div>MONSTER_ICON</div>,
}));

jest.mock("@/components/Cards/CardInspector/CopyrightField", () => ({
  __esModule: true,
  default: () => <div>COPYRIGHT_FIELD</div>,
}));

import GenericInspectorForm from "@/components/Cards/CardInspector/GenericInspectorForm";

function TestHarness({ templateId }: { templateId: "hero" | "hero-back" }) {
  const methods = useForm({ defaultValues: { description: "", face: "front" } });
  return (
    <FormProvider {...methods}>
      <GenericInspectorForm templateId={templateId} />
    </FormProvider>
  );
}

describe("GenericInspectorForm body text fit toggle visibility", () => {
  beforeEach(() => {
    mockContentField.mockClear();
  });

  it("hides the fit toggle for auto-height hero description", () => {
    render(<TestHarness templateId="hero" />);

    const descriptionCall = (mockContentField.mock.calls as Array<[MockContentFieldProps]>).find(
      ([props]) => props?.label === "form.cardText",
    );
    expect(descriptionCall?.[0]?.showBodyTextFitToggle).toBe(false);
  });

  it("shows the fit toggle for fixed-bounds hero back description", () => {
    render(<TestHarness templateId="hero-back" />);

    const descriptionCall = (mockContentField.mock.calls as Array<[MockContentFieldProps]>).find(
      ([props]) => props?.label === "form.backText",
    );
    expect(descriptionCall?.[0]?.showBodyTextFitToggle).toBe(true);
  });
});
