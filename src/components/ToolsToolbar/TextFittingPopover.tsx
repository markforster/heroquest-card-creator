"use client";

import { useEffect, useState, type RefObject } from "react";

import styles from "@/app/page.module.css";
import { useTextFittingPreferences } from "@/components/TextFittingPreferencesContext";
import TextFittingSection from "@/components/ToolsToolbar/TextFittingSection";
import { useI18n } from "@/i18n/I18nProvider";

type TextFittingPopoverProps = {
  popoverRef: RefObject<HTMLDivElement>;
};

export default function TextFittingPopover({ popoverRef }: TextFittingPopoverProps) {
  const { t } = useI18n();
  const { preferences, setRolePreferences, resetRolePreferences, setIsDragging } =
    useTextFittingPreferences();
  const [titleMinDraft, setTitleMinDraft] = useState(preferences.title.minFontPercent ?? 75);
  const [statMinDraft, setStatMinDraft] = useState(preferences.statHeading.minFontPercent ?? 95);

  useEffect(() => {
    setTitleMinDraft(preferences.title.minFontPercent ?? 75);
  }, [preferences.title.minFontPercent]);

  useEffect(() => {
    setStatMinDraft(preferences.statHeading.minFontPercent ?? 95);
  }, [preferences.statHeading.minFontPercent]);

  return (
    <div
      ref={popoverRef}
      className={styles.toolsToolbarPopover}
      role="dialog"
      aria-label={t("label.textFittingSettings")}
    >
      <div className={styles.toolsToolbarPopoverHeader}>{t("label.textFittingGlobal")}</div>
      <div className={styles.toolsToolbarPopoverBody}>
        <TextFittingSection
          role="title"
          title={t("label.textFittingTitle")}
          preferences={preferences}
          minDraft={titleMinDraft}
          onMinDraftChange={setTitleMinDraft}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => {
            setIsDragging(false);
            setRolePreferences("title", { minFontPercent: Number(titleMinDraft) });
          }}
          onReset={() => resetRolePreferences("title")}
          labelPreferEllipsis={t("label.textFittingPreferEllipsis")}
          labelMinFontSize={t("label.textFittingMinFontSize")}
          resetLabel={t("actions.resetTitleDefaults")}
        />
        <TextFittingSection
          role="statHeading"
          title={t("label.textFittingStatHeadings")}
          preferences={preferences}
          minDraft={statMinDraft}
          onMinDraftChange={setStatMinDraft}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => {
            setIsDragging(false);
            setRolePreferences("statHeading", { minFontPercent: Number(statMinDraft) });
          }}
          onReset={() => resetRolePreferences("statHeading")}
          labelPreferEllipsis={t("label.textFittingPreferEllipsis")}
          labelMinFontSize={t("label.textFittingMinFontSize")}
          resetLabel={t("actions.resetStatDefaults")}
        />
        <div className={styles.toolsToolbarPopoverHint}>{t("label.textFittingGlobalHint")}</div>
      </div>
    </div>
  );
}
