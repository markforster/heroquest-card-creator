"use client";

import { Settings } from "lucide-react";

import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useAnalytics } from "@/components/Providers/AnalyticsProvider";
import { useI18n } from "@/i18n/I18nProvider";

export default function SettingsAction() {
  const { t } = useI18n();
  const { track } = useAnalytics();
  const { openSettings, isSettingsOpen } = useAppActions();

  return (
    <NavActionButton
      label={t("actions.settings")}
      icon={Settings}
      onClick={() => {
        track("page_view", { page_path: "/settings", page_title: "Settings" });
        openSettings();
      }}
      title={t("tooltip.openSettings")}
      ariaLabel={t("tooltip.openSettings")}
      isActive={isSettingsOpen}
    />
  );
}
