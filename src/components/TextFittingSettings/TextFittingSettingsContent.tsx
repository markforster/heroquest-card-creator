"use client";

import { useEffect, useState } from "react";

import { useTextFittingPreferences } from "@/components/Providers/TextFittingPreferencesContext";
import TextFittingSettingsForm from "@/components/TextFittingSettings/TextFittingSettingsForm";
import { useI18n } from "@/i18n/I18nProvider";
import type { TextRole } from "@/lib/text-fitting/types";

export type TextFittingSettingsContentProps = {
  onResetTitle?: () => void;
  onResetStat?: () => void;
};

export default function TextFittingSettingsContent({
  onResetTitle,
  onResetStat,
}: TextFittingSettingsContentProps) {
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

  const handleDragEnd = (role: TextRole) => {
    setIsDragging(false);
    if (role === "title") {
      setRolePreferences("title", { minFontPercent: Number(titleMinDraft) });
    } else {
      setRolePreferences("statHeading", { minFontPercent: Number(statMinDraft) });
    }
  };

  return (
    <TextFittingSettingsForm
      preferences={preferences}
      titleMinDraft={titleMinDraft}
      statMinDraft={statMinDraft}
      setRolePreferences={setRolePreferences}
      onTitleMinDraftChange={setTitleMinDraft}
      onStatMinDraftChange={setStatMinDraft}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onResetTitle={onResetTitle ?? (() => resetRolePreferences("title"))}
      onResetStat={onResetStat ?? (() => resetRolePreferences("statHeading"))}
      labelTextFittingTitle={t("label.textFittingTitle")}
      labelTextFittingStatHeadings={t("label.textFittingStatHeadings")}
      labelPreferEllipsis={t("label.textFittingPreferEllipsis")}
      labelMinFontSize={t("label.textFittingMinFontSize")}
      resetTitleLabel={t("actions.resetTitleDefaults")}
      resetStatLabel={t("actions.resetStatDefaults")}
      globalHint={t("label.textFittingGlobalHint")}
    />
  );
}
