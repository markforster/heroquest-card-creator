"use client";

import { fireEvent, render, screen } from "@testing-library/react";

import styles from "@/app/page.module.css";
import CopyrightSettingsPanel from "@/components/Modals/SettingsModal/CopyrightSettingsPanel";
import { cardTemplates } from "@/data/card-templates";

const mockSetDefaultCopyright = jest.fn();
const mockSetTemplateDefault = jest.fn();

jest.mock("@/components/Providers/CopyrightSettingsContext", () => ({
  useCopyrightSettings: () => ({
    defaultCopyright: "© 2026 Hasbro",
    getTemplateDefault: (templateId: string) =>
      templateId === "hero" ||
      templateId === "monster" ||
      templateId === "small-treasure" ||
      templateId === "large-treasure" ||
      templateId === "hero-back" ||
      templateId === "logo-back",
    setDefaultCopyright: mockSetDefaultCopyright,
    setTemplateDefault: mockSetTemplateDefault,
    isReady: true,
  }),
}));

jest.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === "heading.copyrightVisibility") return "Copyright Visibility";
      if (key === "form.defaultCopyright") return "Default copyright";
      if (key === "helper.defaultCopyright") {
        return "This text appears on new front-facing cards unless overridden.";
      }
      if (key === "helper.copyrightTemplateDefaults") {
        return "These toggles set the default copyright visibility for all newly created cards.";
      }
      if (key === "placeholders.defaultCopyrightHolder") return "Copyright holder";
      if (key.startsWith("templates.")) {
        return key.replace("templates.", "");
      }
      return key;
    },
  }),
}));

describe("CopyrightSettingsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders copyright defaults and copyright visibility as two settings groups", () => {
    const { container } = render(<CopyrightSettingsPanel />);

    expect(screen.getByText("Default copyright")).toBeInTheDocument();
    expect(screen.getByText("Copyright Visibility")).toBeInTheDocument();
    expect(
      screen.getByText("This text appears on new front-facing cards unless overridden."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "These toggles set the default copyright visibility for all newly created cards.",
      ),
    ).toBeInTheDocument();

    expect(container.querySelectorAll(`.${styles.settingsGroup}`)).toHaveLength(2);
    expect(container.querySelector(`.${styles.copyrightTemplateDefaultsGrid}`)).not.toBeNull();
    expect(container.querySelectorAll(`.${styles.copyrightTemplateDefaultCard}`)).toHaveLength(8);
    expect(container.querySelector('label[for="defaultCopyright"]')).toBeNull();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(cardTemplates.length);

    cardTemplates.forEach((template) => {
      expect(screen.getByLabelText(template.id)).toBeInTheDocument();
    });
  });

  it("keeps the default copyright input behavior and template toggle wiring", () => {
    jest.useFakeTimers();
    render(<CopyrightSettingsPanel />);

    fireEvent.change(screen.getByLabelText("Default copyright"), {
      target: { value: "© 2027 HeroQuest" },
    });
    jest.advanceTimersByTime(250);
    expect(mockSetDefaultCopyright).toHaveBeenCalledWith("© 2027 HeroQuest");

    fireEvent.click(screen.getByLabelText("labelled-back"));
    expect(mockSetTemplateDefault).toHaveBeenCalledWith("labelled-back", true);

    jest.useRealTimers();
  });
});
