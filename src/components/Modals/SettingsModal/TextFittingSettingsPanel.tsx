"use client";

import styles from "@/app/page.module.css";
import TextFittingSettingsContent from "@/components/TextFittingSettings/TextFittingSettingsContent";

export default function TextFittingSettingsPanel() {
  return (
    <div className={styles.settingsPanelBody}>
      <TextFittingSettingsContent />
    </div>
  );
}
