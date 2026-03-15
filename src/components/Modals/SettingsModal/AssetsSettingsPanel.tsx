"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import { WarningNotice } from "@/components/common/Notice";
import SettingsGroup from "@/components/Modals/SettingsModal/SettingsGroup";
import { useAssetKindQueue } from "@/components/Providers/AssetKindBackfillProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { getAssetAutoClassifyEnabled, setAssetAutoClassifyEnabled } from "@/lib/asset-auto-classify";
import { isSafariBrowser } from "@/lib/browser";

export default function AssetsSettingsPanel() {
  const { t } = useI18n();
  const { setAutoClassifyEnabled } = useAssetKindQueue();
  const [isEnabled, setIsEnabled] = useState(true);
  const isSafari = useMemo(
    () => (typeof window !== "undefined" ? isSafariBrowser() : false),
    [],
  );

  useEffect(() => {
    setIsEnabled(getAssetAutoClassifyEnabled());
  }, []);

  useEffect(() => {
    if (isSafari) {
      setIsEnabled(false);
      setAssetAutoClassifyEnabled(false);
      setAutoClassifyEnabled(false);
    }
  }, [isSafari, setAutoClassifyEnabled]);

  const handleToggle = (next: boolean) => {
    setIsEnabled(next);
    setAssetAutoClassifyEnabled(next);
    setAutoClassifyEnabled(next);
  };

  return (
    <div className={styles.settingsPanelBody}>
      {isSafari ? (
        <WarningNotice role="status">
          {t("warning.safariAutoclassifyUnsupported")}
        </WarningNotice>
      ) : null}
      <SettingsGroup title={t("label.assetClassification")} className="d-flex flex-column gap-2">
        <label className={`${styles.settingsPanelToggle} d-inline-flex align-items-center gap-2`}>
          <input
            type="checkbox"
            className="form-check-input hq-checkbox"
            checked={isEnabled && !isSafari}
            disabled={isSafari}
            onChange={(event) => handleToggle(event.target.checked)}
          />
          {t("label.assetAutoClassifyToggle")}
        </label>
        <div className={styles.settingsPanelRow}>
          {t("label.assetAutoClassifyHelp")}
        </div>
      </SettingsGroup>
    </div>
  );
}
