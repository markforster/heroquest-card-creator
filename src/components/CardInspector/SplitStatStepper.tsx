"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import type { StatValue } from "@/types/stats";

import type { FieldValues, Path } from "react-hook-form";

type SplitStatStepperProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  label: string;
  min?: number;
  max?: number;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function formatBoxValue(value: number): string {
  return value === -1 ? "*" : String(value);
}

export default function SplitStatStepper<TFormValues extends FieldValues>({
  name,
  label,
  min = 0,
  max,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: SplitStatStepperProps<TFormValues>) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext<TFormValues>();
  const valueWatch = useWatch({ control, name }) as StatValue | undefined;

  const isArrayValue = Array.isArray(valueWatch);
  const splitFlag = isArrayValue ? valueWatch[2] : undefined;
  const isSplit = isArrayValue ? splitFlag !== 0 : false;
  const primaryValue = isArrayValue
    ? readNumber(valueWatch[0], 0)
    : readNumber(valueWatch, 0);
  const secondaryValue = isArrayValue
    ? readNumber(valueWatch[1], splitSecondaryDefault)
    : splitSecondaryDefault;

  const resolvedMin = allowWildcard ? Math.min(min, -1) : min;

  const clampValue = (raw: number) => {
    if (max == null) return Math.max(resolvedMin, raw);
    return Math.min(max, Math.max(resolvedMin, raw));
  };

  const setSingleValue = (next: number) => {
    setValue(name, clampValue(next) as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const setSplitValue = (nextPrimary: number, nextSecondary: number, nextFlag: 0 | 1) => {
    setValue(
      name,
      [clampValue(nextPrimary), clampValue(nextSecondary), nextFlag] as unknown as TFormValues[keyof TFormValues],
      {
        shouldDirty: true,
        shouldTouch: true,
      },
    );
  };

  const handleChange = (delta: number, which: "primary" | "secondary") => {
    if (!isSplit) {
      if (isArrayValue) {
        if (which === "primary") {
          setSplitValue(primaryValue + delta, secondaryValue, 0);
        }
        return;
      }
      setSingleValue(primaryValue + delta);
      return;
    }
    if (which === "primary") {
      setSplitValue(primaryValue + delta, secondaryValue, 1);
    } else {
      setSplitValue(primaryValue, secondaryValue + delta, 1);
    }
  };

  const canDecrement = (value: number) => value > resolvedMin;
  const canIncrement = (value: number) => max == null || value < max;

  const toggleSplit = () => {
    if (isSplit) {
      setSplitValue(primaryValue, secondaryValue, 0);
    } else {
      setSplitValue(primaryValue, secondaryValue, 1);
    }
  };

  const renderStatField = (value: number, which: "primary" | "secondary") => (
    <div className={layoutStyles.statField}>
      <div className={layoutStyles.statValueBox} title={`${t("tooltip.valueFor")} ${label}`}>
        {formatBoxValue(value)}
      </div>
      <div className={layoutStyles.statButtons}>
        <button
          type="button"
          className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonMinus}`}
          title={`${t("tooltip.decrease")} ${label}`}
          onClick={() => handleChange(-1, which)}
          disabled={!canDecrement(value)}
        >
          -
        </button>
        <button
          type="button"
          className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonPlus}`}
          title={`${t("tooltip.increase")} ${label}`}
          onClick={() => handleChange(1, which)}
          disabled={!canIncrement(value)}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className={layoutStyles.statCell}>
      <div className={layoutStyles.statControlRow}>
        <div className={layoutStyles.statSubLabel}>{label}</div>
        <div className={layoutStyles.statSplitFields}>
          {renderStatField(primaryValue, "primary")}
          <button
            type="button"
            className={`${layoutStyles.statIconButton} ${layoutStyles.statChevronButton}`}
            title={isSplit ? t("tooltip.removeSecondValue") : t("tooltip.addSecondValue")}
            aria-label={isSplit ? t("tooltip.removeSecondValue") : t("tooltip.addSecondValue")}
            onClick={toggleSplit}
          >
            {isSplit ? (
              <ChevronRight className={layoutStyles.icon} aria-hidden="true" />
            ) : (
              <ChevronLeft className={layoutStyles.icon} aria-hidden="true" />
            )}
          </button>
          {isSplit ? renderStatField(secondaryValue, "secondary") : null}
        </div>
      </div>
    </div>
  );
}
