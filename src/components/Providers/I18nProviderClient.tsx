"use client";

import { CopyrightSettingsProvider } from "@/components/Providers/CopyrightSettingsContext";
import StatLabelOverridesProvider from "@/components/Providers/StatLabelOverridesProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { PropsWithChildren } from "react";

export default function I18nProviderClient({ children }: PropsWithChildren) {
  return (
    <I18nProvider>
      <StatLabelOverridesProvider>
        <CopyrightSettingsProvider>{children}</CopyrightSettingsProvider>
      </StatLabelOverridesProvider>
    </I18nProvider>
  );
}
