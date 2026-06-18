import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/Cards/CardInspector/TitleField", () => ({
  __esModule: true,
  default: () => <div>TITLE_FIELD</div>,
}));

jest.mock("@/components/Cards/CardInspector/NameField", () => ({
  __esModule: true,
  default: () => <div>NAME_FIELD</div>,
}));

jest.mock("@/components/Cards/CardInspector/ContentField", () => ({
  __esModule: true,
  default: () => <div>CONTENT_FIELD</div>,
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

function TestHarness() {
  const methods = useForm({
    defaultValues: {
      name: "Treasure Deck",
      face: "back",
    },
  });

  return (
    <FormProvider {...methods}>
      <GenericInspectorForm templateId="hero-back" />
    </FormProvider>
  );
}

describe("GenericInspectorForm hero-back name field", () => {
  it("renders NameField instead of TitleField for hero-back", () => {
    render(<TestHarness />);

    expect(screen.getByText("NAME_FIELD")).toBeInTheDocument();
    expect(screen.queryByText("TITLE_FIELD")).not.toBeInTheDocument();
  });
});
