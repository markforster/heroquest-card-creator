"use client";

import StatLabelOverridesProvider from "@/components/StatLabelOverridesProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { PropsWithChildren } from "react";

export default function I18nProviderClient({ children }: PropsWithChildren) {
  return (
    <I18nProvider>
      <StatLabelOverridesProvider>{children}</StatLabelOverridesProvider>
    </I18nProvider>
  );
}
