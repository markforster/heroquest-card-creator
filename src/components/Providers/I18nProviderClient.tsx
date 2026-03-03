"use client";

import { CollectionsTreeSettingsProvider } from "@/components/Providers/CollectionsTreeSettingsContext";
import { CopyrightSettingsProvider } from "@/components/Providers/CopyrightSettingsContext";
import { ExportSettingsProvider } from "@/components/Providers/ExportSettingsContext";
import StatLabelOverridesProvider from "@/components/Providers/StatLabelOverridesProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

import type { PropsWithChildren } from "react";

export default function I18nProviderClient({ children }: PropsWithChildren) {
  return (
    <I18nProvider>
      <StatLabelOverridesProvider>
        <CopyrightSettingsProvider>
          <ExportSettingsProvider>
            <CollectionsTreeSettingsProvider>{children}</CollectionsTreeSettingsProvider>
          </ExportSettingsProvider>
        </CopyrightSettingsProvider>
      </StatLabelOverridesProvider>
    </I18nProvider>
  );
}
