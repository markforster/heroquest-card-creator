"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { useI18n } from "@/i18n/I18nProvider";
import { hasStatAsterisk, normalizeStatAsteriskFlags, setStatAsterisk } from "@/lib/stat-asterisks";
import type { StatAsteriskFlags } from "@/types/stats";

import { formatStatInputValue, parseStatInputValue } from "./stat-stepper-input";

import type { LucideIcon } from "lucide-react";
import type { FieldValues, Path } from "react-hook-form";

type StatStepperProps<TFormValues extends FieldValues> = {
  name: Path<TFormValues>;
  asterisksName?: Path<TFormValues>;
  label: string;
  icon?: LucideIcon;
  min?: number;
  max?: number;
  allowWildcard?: boolean;
};

export default function StatStepper<TFormValues extends FieldValues>({
  name,
  asterisksName,
  label,
  icon: Icon,
  min = 0,
  max = 999,
  allowWildcard = false,
}: StatStepperProps<TFormValues>) {
  const { t } = useI18n();
  const { control, setValue } = useFormContext<TFormValues>();
  const valueWatch = useWatch({ control, name }) as number | undefined;
  const asterisksWatchValue = useWatch({
    control,
    name: asterisksName ?? name,
  });
  const asterisksWatch = asterisksName
    ? (asterisksWatchValue as StatAsteriskFlags | undefined)
    : undefined;
  const value = typeof valueWatch === "number" && !Number.isNaN(valueWatch) ? valueWatch : 0;
  const asterisks = normalizeStatAsteriskFlags(asterisksWatch);
  const resolvedMin = allowWildcard ? Math.min(min, -1) : min;

  const canDecrement = value !== -1 && value > resolvedMin;
  const canIncrement = value === -1 || value < max;
  const canToggleAsterisk = Boolean(asterisksName) && value !== -1;
  const formattedValue = formatStatInputValue(value);
  const lastValidRef = useRef(value);
  const [inputValue, setInputValue] = useState(formattedValue);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (delta: number) => {
    if (value === -1) {
      if (delta > 0) {
        setValue(name, 0 as unknown as TFormValues[keyof TFormValues], {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
      return;
    }
    const nextRaw = value + delta;
    const next = Math.min(max, Math.max(resolvedMin, nextRaw));
    setValue(name, next as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  useEffect(() => {
    lastValidRef.current = value;
    if (!isFocused) {
      setInputValue(formattedValue);
    }
  }, [value, formattedValue, isFocused]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextText = event.target.value;
    if (nextText === "") {
      setInputValue("");
      return;
    }
    const nextValue = parseStatInputValue(nextText, { min, max, allowWildcard });
    if (nextValue == null) return;
    lastValidRef.current = nextValue;
    setInputValue(formatStatInputValue(nextValue));
    setValue(name, nextValue as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    const selectionStart = event.currentTarget.selectionStart ?? 0;
    const selectionEnd = event.currentTarget.selectionEnd ?? 0;
    const nextText = `${inputValue.slice(0, selectionStart)}${pasted}${inputValue.slice(selectionEnd)}`;
    const nextValue = parseStatInputValue(nextText, { min, max, allowWildcard });
    if (nextValue == null) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    lastValidRef.current = nextValue;
    setInputValue(formatStatInputValue(nextValue));
    setValue(name, nextValue as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue === "") {
      const resetValue = formatStatInputValue(lastValidRef.current);
      setInputValue(resetValue);
    }
  };

  const toggleAsterisk = () => {
    if (!asterisksName || value === -1) return;
    const nextAsterisks = setStatAsterisk(asterisks, 0, !hasStatAsterisk(asterisks, 0));
    setValue(asterisksName, nextAsterisks as unknown as TFormValues[keyof TFormValues], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  return (
    <div className={layoutStyles.statCell}>
      <div className={`${layoutStyles.statControlRow} ${layoutStyles.uRowSm}`}>
        <div className={layoutStyles.statSubLabel}>
          {Icon ? (
            <Icon className={layoutStyles.statSubLabelIcon} aria-hidden="true" size={14} />
          ) : null}
          <span>{label}</span>
        </div>
        <div className={layoutStyles.statField}>
          <div className={layoutStyles.statValueInputWrap}>
            <input
              className={`${layoutStyles.statValueInput} ${
                asterisksName ? layoutStyles.statValueInputWithAsterisk : ""
              }`}
              title={`${t("tooltip.valueFor")} ${label}`}
              aria-label={t("tooltip.valueFor")}
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
            />
            {asterisksName ? (
              <button
                type="button"
                className={`${layoutStyles.statIconButton} ${layoutStyles.statAsteriskButton} ${
                  hasStatAsterisk(asterisks, 0) ? layoutStyles.statAsteriskButtonActive : ""
                }`}
                title={`${label} *`}
                aria-label={`${label} *`}
                aria-pressed={hasStatAsterisk(asterisks, 0)}
                onClick={toggleAsterisk}
                disabled={!canToggleAsterisk}
              >
                <span className={layoutStyles.statAsteriskGlyph}>∗</span>
              </button>
            ) : null}
          </div>
          <div className={layoutStyles.statActionCluster}>
            <div className={layoutStyles.statButtons}>
              <button
                type="button"
                className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonMinus}`}
                title={`${t("tooltip.decrease")} ${label}`}
                onClick={() => handleChange(-1)}
                disabled={!canDecrement}
              >
                <Minus className={layoutStyles.statButtonIcon} aria-hidden="true" size={12} />
              </button>
              <button
                type="button"
                className={`${layoutStyles.statIconButton} ${layoutStyles.statIconButtonPlus}`}
                title={`${t("tooltip.increase")} ${label}`}
                onClick={() => handleChange(1)}
                disabled={!canIncrement}
              >
                <Plus className={layoutStyles.statButtonIcon} aria-hidden="true" size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
