"use client";

import styles from "@/app/page.module.css";
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/i18n/I18nProvider";

import LeftNavBottom from "./LeftNavBottom";
import LeftNavCollapseToggle from "./LeftNavCollapseToggle";
import LeftNavMiddle from "./LeftNavMiddle";
import LeftNavPrimaryActions from "./LeftNavPrimaryActions";
import SettingsAction from "./SettingsAction";
import { useLeftNavCollapse } from "./useLeftNavCollapse";

export default function LeftNav() {
  const { t } = useI18n();
  const { isCollapsed, setManualCollapsed, isCollapsedReady } = useLeftNavCollapse();
  const collapseStateLabel = isCollapsed ? "Expand navigation" : "Collapse navigation";

  if (!isCollapsedReady) {
    return null;
  }

  return (
    <nav
      className={`${styles.leftNav} ${isCollapsed ? styles.leftNavCollapsed : ""}`}
      aria-label={t("app.title")}
    >
      <div className={styles.leftNavInner}>
        <LeftNavCollapseToggle
          isCollapsed={isCollapsed}
          label={collapseStateLabel}
          onToggle={() => setManualCollapsed((prev) => !prev)}
        />
        <LeftNavMiddle>
          <LeftNavPrimaryActions />
        </LeftNavMiddle>
        <LeftNavBottom>
          <SettingsAction />
          <LanguageMenu isCollapsed={isCollapsed} />
        </LeftNavBottom>
      </div>
    </nav>
  );
}
