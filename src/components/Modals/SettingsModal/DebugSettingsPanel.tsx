"use client";

import { useState } from "react";

import styles from "@/app/page.module.css";
import { useDebugVisuals } from "@/components/Providers/DebugVisualsContext";
import { clearAssetClassification } from "@/lib/assets-db";
import { DangerNotice, SuccessNotice, WarningNotice } from "@/components/common/Notice";
import { useI18n } from "@/i18n/I18nProvider";

export default function DebugSettingsPanel() {
  const { t } = useI18n();
  const { showTextBounds, setShowTextBounds } = useDebugVisuals();
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  const handleClearAssetClassification = async () => {
    if (isClearing) return;
    setIsClearing(true);
    setClearMessage(null);
    setClearError(null);
    try {
      const count = await clearAssetClassification();
      setClearMessage(
        t("label.assetClassificationCleared").replace("${count}", String(count)),
      );
    } catch {
      setClearError(t("label.assetClassificationClearFailed"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className={styles.settingsPanelBody}>
      <WarningNotice role="status">
        Debug is enabled while we work through version 0.5.x and will be turned off in a future
        release.
      </WarningNotice>
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-2`}>
        <div className={styles.settingsPanelSectionTitle}>{t("label.debugVisuals")}</div>
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={showTextBounds}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setShowTextBounds(event.target.checked)
            }
          />
          {t("label.debugTextBounds")}
        </label>
      </div>
      <div className={`${styles.settingsPanelSection} d-flex flex-column gap-3`}>
        <div className={styles.settingsPanelSectionTitle}>
          {t("actions.clearAssetClassification")}
        </div>
        <WarningNotice>
          {t("warning.clearAssetClassificationDestructive")}
        </WarningNotice>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleClearAssetClassification}
            disabled={isClearing}
          >
            {isClearing
              ? t("label.clearingAssetClassification")
              : t("actions.clearAssetClassification")}
          </button>
        </div>
        {clearMessage ? <SuccessNotice>{clearMessage}</SuccessNotice> : null}
        {clearError ? <DangerNotice>{clearError}</DangerNotice> : null}
      </div>
    </div>
  );
}
