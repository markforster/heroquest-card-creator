"use client";

import {
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutTemplate,
  Settings,
  SquareStack,
} from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { useAppActions } from "@/components/AppActionsContext";
import { useCardEditor } from "@/components/CardEditor/CardEditorContext";
import KeyBinding from "@/components/KeyBinding";
import LanguageMenu from "@/components/LanguageMenu";
import NavActionButton from "@/components/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";

const COLLAPSE_MEDIA_QUERY = "(max-width: 1280px)";
const NAV_COLLAPSE_STORAGE_KEY = "hqcc.leftNavCollapsed";

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
  const {
    openAssets,
    openStockpile,
    openSettings,
    openTemplatePicker,
    hasTemplate,
    isTemplatePickerOpen,
    isAssetsOpen,
    isStockpileOpen,
    isSettingsOpen,
  } = useAppActions();
  const {
    state: { selectedTemplateId, activeCardIdByTemplate },
  } = useCardEditor();
  const autoCollapsed = useMediaQuery(COLLAPSE_MEDIA_QUERY);
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const [isCollapsedReady, setIsCollapsedReady] = useState(false);
  const isCollapsed = autoCollapsed || manualCollapsed;
  const collapseStateLabel = isCollapsed ? "Expand navigation" : "Collapse navigation";
  const activeCardId =
    selectedTemplateId != null ? activeCardIdByTemplate[selectedTemplateId] : undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(NAV_COLLAPSE_STORAGE_KEY);
      if (stored === "true") {
        setManualCollapsed(true);
      }
      setIsCollapsedReady(true);
    } catch {
      // Ignore localStorage errors.
      setIsCollapsedReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(NAV_COLLAPSE_STORAGE_KEY, String(manualCollapsed));
    } catch {
      // Ignore localStorage errors.
    }
  }, [manualCollapsed]);

  if (!isCollapsedReady) {
    return null;
  }

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
            <KeyBinding
              combo={{ key: "y", shift: true, meta: true }}
              onTrigger={() => openTemplatePicker()}
              label={t("tooltip.chooseTemplate")}
            >
              <KeyBinding
                combo={{ key: "y", shift: true, ctrl: true }}
                onTrigger={() => openTemplatePicker()}
                label={t("tooltip.chooseTemplate")}
              >
                <NavActionButton
                  label={t("actions.templates")}
                  icon={LayoutTemplate}
                  onClick={openTemplatePicker}
                  ariaLabel={t("tooltip.chooseTemplate")}
                  title={t("tooltip.chooseTemplate")}
                  disabled={!hasTemplate}
                  isActive={isTemplatePickerOpen}
                />
              </KeyBinding>
            </KeyBinding>
            <NavActionButton
              label={t("actions.cards")}
              icon={SquareStack}
              onClick={() =>
                openStockpile({
                  initialSelectedIds: activeCardId ? [activeCardId] : [],
                })
              }
              title={t("tooltip.openCards")}
              ariaLabel={t("tooltip.openCards")}
              isActive={isStockpileOpen}
            />
            <NavActionButton
              label={t("actions.assets")}
              icon={Images}
              onClick={openAssets}
              title={t("tooltip.openAssets")}
              ariaLabel={t("tooltip.openAssets")}
              isActive={isAssetsOpen}
            />
          </div>
        </div>
        <div className={styles.leftNavBottom}>
          <div className={styles.leftNavList}>
            <NavActionButton
              label={t("actions.settings")}
              icon={Settings}
              onClick={openSettings}
              title={t("tooltip.openSettings")}
              ariaLabel={t("tooltip.openSettings")}
              isActive={isSettingsOpen}
            />
            <LanguageMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </nav>
  );
}
