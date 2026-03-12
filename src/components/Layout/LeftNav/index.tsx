"use client";

import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

import LeftNavBottom from "./LeftNavBottom";
import LeftNavActionStrip from "./LeftNavActionStrip";
import LeftNavCollapseToggle from "./LeftNavCollapseToggle";
import LeftNavDownloadAction from "./LeftNavDownloadAction";
import LeftNavMiddle from "./LeftNavMiddle";
import LeftNavPrimaryActions from "./LeftNavPrimaryActions";
import LeftNavSpacer from "./LeftNavSpacer";
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
          <LeftNavActionStrip isCollapsed={isCollapsed} />
          <LeftNavSpacer size="small" showLine={false} />
          <LeftNavDownloadAction />
        </LeftNavBottom>
      </div>
    </nav>
  );
}
