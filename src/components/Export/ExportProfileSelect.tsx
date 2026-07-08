"use client";

import FormSelect, { type FormSelectOption } from "@/components/common/FormSelect";
import selectStyles from "@/components/common/FormSelect.module.css";
import { useI18n } from "@/i18n/I18nProvider";

import type { ExportProfile } from "@/lib/export-profiles";

type ExportProfileOption = FormSelectOption & {
  isDefault: boolean;
};

type ExportProfileSelectProps = {
  profiles: ExportProfile[];
  selectedProfileId?: string;
  defaultProfileId?: string;
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (profileId: string) => void;
};

export default function ExportProfileSelect({
  profiles,
  selectedProfileId,
  defaultProfileId,
  disabled = false,
  ariaLabel,
  onChange,
}: ExportProfileSelectProps) {
  const { t } = useI18n();
  const options: ExportProfileOption[] = profiles.map((profile) => ({
    value: profile.id,
    label: profile.name,
    isDefault: profile.id === defaultProfileId,
  }));

  if (!options.length) {
    return null;
  }

  return (
    <FormSelect
      value={selectedProfileId ?? options[0].value}
      options={options}
      disabled={disabled}
      ariaLabel={ariaLabel}
      onChange={onChange}
      renderOptionLabel={(option) => (
        <div className={selectStyles.optionContent}>
          <span className={selectStyles.optionLabel} title={option.label}>
            {option.label}
          </span>
          {option.isDefault ? (
            <span className={selectStyles.optionPill}>{t("status.default")}</span>
          ) : null}
        </div>
      )}
    />
  );
}
