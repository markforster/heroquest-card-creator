"use client";

import { AssetHashIndexProvider } from "@/components/Providers/AssetHashIndexProvider";
import { CardEditorProvider } from "@/components/Providers/CardEditorContext";
import { DebugVisualsProvider } from "@/components/Providers/DebugVisualsContext";
import { EditorFormProvider } from "@/components/Providers/EditorFormContext";
import { LocalStorageProvider } from "@/components/Providers/LocalStorageProvider";
import { MissingAssetsProvider } from "@/components/Providers/MissingAssetsContext";
import { PreviewRendererProvider } from "@/components/Providers/PreviewRendererContext";
import { TextFittingPreferencesProvider } from "@/components/Providers/TextFittingPreferencesContext";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { WebglPreviewSettingsProvider } from "@/components/Providers/WebglPreviewSettingsContext";

import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <CardEditorProvider>
      <EditorFormProvider>
        <AssetHashIndexProvider>
          <LocalStorageProvider>
            <ThemeProvider>
              <DebugVisualsProvider>
                <PreviewRendererProvider>
                  <WebglPreviewSettingsProvider>
                    <TextFittingPreferencesProvider>
                      <MissingAssetsProvider>{children}</MissingAssetsProvider>
                    </TextFittingPreferencesProvider>
                  </WebglPreviewSettingsProvider>
                </PreviewRendererProvider>
              </DebugVisualsProvider>
            </ThemeProvider>
          </LocalStorageProvider>
        </AssetHashIndexProvider>
      </EditorFormProvider>
    </CardEditorProvider>
  );
}
