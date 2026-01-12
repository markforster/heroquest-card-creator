import { render, screen } from "@testing-library/react";

import MainHeader from "@/components/MainHeader";
import { I18nProvider } from "@/i18n/I18nProvider";

jest.mock("next/image", () => ({
  __esModule: true,
  default: function NextImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // next/image accepts props that don't exist on a native <img> (e.g. `priority`).
    // Drop unknown props to avoid React "non-boolean attribute" warnings in tests.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { priority, ...rest } = props as React.ImgHTMLAttributes<HTMLImageElement> & {
      priority?: boolean;
    };
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

describe("MainHeader", () => {
  it("renders the template button label from props", () => {
    render(
      <I18nProvider>
        <MainHeader
          hasTemplate
          currentTemplateName="Hero Card"
          onOpenTemplatePicker={() => {}}
          onOpenAssets={() => {}}
          onOpenStockpile={() => {}}
          onOpenSettings={() => {}}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Template: Hero Card/i })).toBeInTheDocument();
  });

  it("falls back to loading label when currentTemplateName is missing", () => {
    render(
      <I18nProvider>
        <MainHeader
          hasTemplate
          onOpenTemplatePicker={() => {}}
          onOpenAssets={() => {}}
          onOpenStockpile={() => {}}
          onOpenSettings={() => {}}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Template: Loading/i })).toBeInTheDocument();
  });

  it("disables the template button when hasTemplate is false", () => {
    render(
      <I18nProvider>
        <MainHeader
          hasTemplate={false}
          currentTemplateName="Hero Card"
          onOpenTemplatePicker={() => {}}
          onOpenAssets={() => {}}
          onOpenStockpile={() => {}}
          onOpenSettings={() => {}}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: /Template:/i })).toBeDisabled();
  });
});
