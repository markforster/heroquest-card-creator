"use client";

import { Clock } from "lucide-react";

import NavActionButton from "@/components/NavActionButton";
import { useAppActions } from "@/components/AppActionsContext";
import { useI18n } from "@/i18n/I18nProvider";

export default function RecentCardsAction() {
  const { t } = useI18n();
  const { openRecent, isRecentOpen } = useAppActions();

  return (
    <NavActionButton
      label={t("actions.recentCards")}
      icon={Clock}
      onClick={openRecent}
      title={t("actions.recentCards")}
      ariaLabel={t("actions.recentCards")}
      isActive={isRecentOpen}
    />
  );
}
