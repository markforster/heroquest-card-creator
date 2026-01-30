"use client";

import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight, Images, Settings, SquareStack } from "lucide-react";
import { useAppActions } from "@/components/AppActionsContext";
import LanguageMenu from "@/components/LanguageMenu";
import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

const COLLAPSE_MEDIA_QUERY = "(max-width: 1280px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export default function LeftNav() {
  const { t } = useI18n();
  const { openAssets, openStockpile, openSettings } = useAppActions();
  const autoCollapsed = useMediaQuery(COLLAPSE_MEDIA_QUERY);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const isCollapsed = autoCollapsed || manualCollapsed;
  const collapseStateLabel = isCollapsed ? "Expand navigation" : "Collapse navigation";

  return (
    <nav
      className={`${styles.leftNav} ${isCollapsed ? styles.leftNavCollapsed : ""}`}
      aria-label={t("app.title")}
    >
      <div className={styles.leftNavInner}>
        <div className={styles.leftNavTop}>
          <button
            className={styles.leftNavToggle}
            type="button"
            onClick={() => setManualCollapsed((prev) => !prev)}
            title={collapseStateLabel}
            aria-label={collapseStateLabel}
          >
            {isCollapsed ? (
              <ChevronRight className={styles.leftNavToggleIcon} aria-hidden="true" />
            ) : (
              <ChevronLeft className={styles.leftNavToggleIcon} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className={styles.leftNavMiddle}>
          <div className={styles.leftNavList}>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openStockpile}
              title={t("tooltip.openCards")}
              aria-label={t("tooltip.openCards")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <SquareStack />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.cards")}</span>
            </button>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openAssets}
              title={t("tooltip.openAssets")}
              aria-label={t("tooltip.openAssets")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Images />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.assets")}</span>
            </button>
          </div>
        </div>
        <div className={styles.leftNavBottom}>
          <div className={styles.leftNavList}>
            <button
              className={styles.leftNavItem}
              type="button"
              onClick={openSettings}
              title={t("tooltip.openSettings")}
              aria-label={t("tooltip.openSettings")}
            >
              <span className={styles.leftNavGlyph} aria-hidden="true">
                <Settings />
              </span>
              <span className={styles.leftNavLabel}>{t("actions.settings")}</span>
            </button>
            <LanguageMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </nav>
  );
}
