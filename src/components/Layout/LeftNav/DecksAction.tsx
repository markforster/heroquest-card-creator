"use client";

import { Layers } from "lucide-react";

import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import { useI18n } from "@/i18n/I18nProvider";

type DecksActionProps = {
  isEnabled: boolean;
};

export default function DecksAction({ isEnabled }: DecksActionProps) {
  const { t } = useI18n();

  if (!isEnabled) {
    return null;
  }

  return (
    <NavActionButton
      label={t("actions.decks")}
      icon={Layers}
      onClick={() => {}}
      title={t("actions.decks")}
      ariaLabel={t("actions.decks")}
      isActive={false}
    />
  );
}
