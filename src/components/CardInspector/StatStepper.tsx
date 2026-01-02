"use client";

import { Minus, Plus } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";

import type { FieldValues, Path } from "react-hook-form";

type StatStepperProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: string;
  min?: number;
  max?: number;
};

export default function StatStepper<TFormValues extends FieldValues>({
  name,
  label,
  min = 0,
  max,
}: StatStepperProps<TFormValues>) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext<TFormValues>();
  const valueWatch = useWatch({ control, name }) as number | undefined;
  const value = typeof valueWatch === "number" && !Number.isNaN(valueWatch) ? valueWatch : 0;

  const canDecrement = value > min;
  const canIncrement = max == null || value < max;

  const handleChange = (delta: number) => {
    const nextRaw = value + delta;
    const next = max == null ? Math.max(min, nextRaw) : Math.min(max, Math.max(min, nextRaw));
    setValue(name, next as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className={layoutStyles.statCell}>
      <div className={layoutStyles.statControlRow}>
        <div className={layoutStyles.statSubLabel}>{label}</div>
        <div className={layoutStyles.statField}>
          <div className={layoutStyles.statValueBox} title={`${t("tooltip.valueFor")} ${label}`}>
            {value}
          </div>
          <button
            type="button"
            className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonMinus} btn btn-sm`}
            title={`${t("tooltip.decrease")} ${label}`}
            onClick={() => handleChange(-1)}
            disabled={!canDecrement}
          >
            <Minus className={layoutStyles.icon} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonPlus} btn btn-sm`}
            title={`${t("tooltip.increase")} ${label}`}
            onClick={() => handleChange(1)}
            disabled={!canIncrement}
          >
            <Plus className={layoutStyles.icon} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
