"use client";

import { Link } from "react-router-dom";

import styles from "@/app/page.module.css";
import { EscapeStackProvider } from "@/components/common/EscapeStackProvider";
import { WarningNotice } from "@/components/common/Notice";
import HeaderWithTemplatePicker from "@/components/Layout/HeaderWithTemplatePicker";
import LeftNav from "@/components/Layout/LeftNav";
import MainFooter from "@/components/Layout/MainFooter";
import { AppActionsProvider } from "@/components/Providers/AppActionsContext";
import { AssetKindBackfillProvider } from "@/components/Providers/AssetKindBackfillProvider";
import {
  EditorSaveProvider,
  type EditorSaveContextValue,
} from "@/components/Providers/EditorSaveContext";
import { LibraryTransferProvider } from "@/components/Providers/LibraryTransferContext";
import { useLocalStorageBoolean } from "@/components/Providers/LocalStorageProvider";
import { useMissingAssets } from "@/components/Providers/MissingAssetsContext";
import { ENABLE_MISSING_ASSET_CHECKS } from "@/config/flags";
import { useI18n } from "@/i18n/I18nProvider";
import formatMessageWith from "@/lib/format-message-with";

import type { ReactNode } from "react";

export const noopEditorSaveValue: EditorSaveContextValue = {
  saveCurrentCard: async () => false,
  repairCurrentCardThumbnail: async () => false,
  saveToken: 0,
};

type AppShellProps = {
  children: ReactNode;
  editorSaveValue?: EditorSaveContextValue;
};

export default function AppShell({
  children,
  editorSaveValue = noopEditorSaveValue,
}: AppShellProps) {
  const { t } = useI18n();
  const { missingAssetsReport } = useMissingAssets();
  const [missingAssetsDismissed, setMissingAssetsDismissed] = useLocalStorageBoolean(
    "hqcc.missingArtworkBannerDismissed",
    false,
  );

  return (
    <div className={`${styles.page} d-flex flex-column`}>
      <LibraryTransferProvider>
        <EditorSaveProvider value={editorSaveValue}>
          <EscapeStackProvider>
            <AssetKindBackfillProvider>
              <AppActionsProvider>
                <HeaderWithTemplatePicker
                  missingAssetsCount={missingAssetsReport.length}
                  showMissingAssetsReminder={
                    missingAssetsDismissed && missingAssetsReport.length > 0
                  }
                />
                {ENABLE_MISSING_ASSET_CHECKS &&
                missingAssetsReport.length > 0 &&
                !missingAssetsDismissed ? (
                  <div className={styles.missingAssetsBanner}>
                    <WarningNotice role="status" className="d-flex align-items-start gap-3">
                      <Link className={styles.missingAssetsBannerLink} to="/cards?missingartwork">
                        <div className={styles.missingAssetsBannerBody}>
                          <div className={styles.missingAssetsBannerTitle}>
                            {t("warning.missingArtworkDetectedTitle")}
                          </div>
                          <div>
                            {formatMessageWith(t, "warning.missingArtworkDetectedBody", {
                              count: missingAssetsReport.length,
                            })}
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={`btn btn-outline-light btn-sm ${styles.missingAssetsBannerClose}`}
                        onClick={() => setMissingAssetsDismissed(true)}
                      >
                        {t("actions.dismiss")}
                      </button>
                    </WarningNotice>
                  </div>
                ) : null}
                <main className={`${styles.main} d-flex`}>
                  <LeftNav />
                  {children}
                </main>
              </AppActionsProvider>
            </AssetKindBackfillProvider>
          </EscapeStackProvider>
        </EditorSaveProvider>
        <MainFooter />
      </LibraryTransferProvider>
    </div>
  );
}
