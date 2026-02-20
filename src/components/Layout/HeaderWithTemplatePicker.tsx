"use client";

import MainHeader from "@/components/Layout/MainHeader";

type HeaderWithTemplatePickerProps = {
  missingAssetsCount?: number;
  showMissingAssetsReminder?: boolean;
};

export default function HeaderWithTemplatePicker({
  missingAssetsCount,
  showMissingAssetsReminder,
}: HeaderWithTemplatePickerProps) {
  return (
    <MainHeader
      missingAssetsCount={missingAssetsCount}
      showMissingAssetsReminder={showMissingAssetsReminder}
    />
  );
}
