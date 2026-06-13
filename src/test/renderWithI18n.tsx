import { render } from "@testing-library/react";

import { I18nProvider } from "@/i18n/I18nProvider";

import type { ReactElement, ReactNode } from "react";
import type { RenderOptions } from "@testing-library/react";

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

export function renderWithI18n(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: Wrapper,
    ...options,
  });
}
