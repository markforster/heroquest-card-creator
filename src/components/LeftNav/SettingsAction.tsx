"use client";

import { Settings } from "lucide-react";

import NavActionButton from "@/components/NavActionButton";
import { useAppActions } from "@/components/Providers/AppActionsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function SettingsAction() {
  const { t } = useI18n();
  const { openSettings, isSettingsOpen } = useAppActions();

  return (
    <NavActionButton
      label={t("actions.settings")}
      icon={Settings}
      onClick={openSettings}
      title={t("tooltip.openSettings")}
      ariaLabel={t("tooltip.openSettings")}
      isActive={isSettingsOpen}
    />
  );
}
