"use client";

import { useMemo, useRef } from "react";
import { useFormContext, useWatch, type FieldValues, type Path } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import type { EditorTargetId } from "@/components/Cards/CardEditor/EditorTargetsContext";
import { useInspectorTargetRegistration } from "@/components/Cards/CardEditor/EditorTargetsContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import { formatStatValue } from "@/lib/stat-values";
import type { StatValue } from "@/types/stats";

import SplitStatStepper from "./SplitStatStepper";
import StatsAccordion from "./StatsAccordion";
import StatStepper from "./StatStepper";

import type { LucideIcon } from "lucide-react";

export type BaseStatField<T extends FieldValues> = {
  name: Path<T>;
  labelKey: MessageKey;
  icon: LucideIcon;
  targetId: EditorTargetId;
};

export type BaseStatsInspectorProps<T extends FieldValues> = {
  fields: BaseStatField<T>[];
  targetId: EditorTargetId;
  allowSplit?: boolean;
  allowWildcard?: boolean;
  splitSecondaryDefault?: number;
};

export default function BaseStatsInspector<T extends FieldValues>({
  fields,
  targetId,
  allowSplit = false,
  allowWildcard = false,
  splitSecondaryDefault = 0,
}: BaseStatsInspectorProps<T>) {
  const { t } = useI18n();
  const { control } = useFormContext<T>();
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const StatControl = allowSplit ? SplitStatStepper<T> : StatStepper<T>;
  const handleFieldFocusCapture = useInspectorTargetRegistration({
    targetId,
    containerRef: fieldRef,
    focusSelectors: ["input:not([disabled])", "button:not([disabled])"],
  });
  const watchedFieldNames = useMemo(
    () => fields.map((field) => field.name),
    [fields],
  );

  const watchedValues = useWatch({
    control,
    name: watchedFieldNames,
  }) as Array<StatValue | undefined>;
  const previewValues = watchedValues.map((value) => formatStatValue(value) ?? "0");

  return (
    <div ref={fieldRef} data-hqcc-edit={targetId} onFocusCapture={handleFieldFocusCapture}>
      <StatsAccordion label={t("form.stats")} previewValues={previewValues}>
        <div className={layoutStyles.statRows}>
          {fields.map((field) => (
            <StatInspectorRow
              key={String(field.name)}
              field={field}
              allowWildcard={allowWildcard}
              splitSecondaryDefault={splitSecondaryDefault}
              StatControl={StatControl}
              label={t(field.labelKey)}
            />
          ))}
        </div>
      </StatsAccordion>
    </div>
  );
}

type StatInspectorRowProps<T extends FieldValues> = {
  field: BaseStatField<T>;
  allowWildcard: boolean;
  splitSecondaryDefault: number;
  StatControl: typeof SplitStatStepper<T> | typeof StatStepper<T>;
  label: string;
};

function StatInspectorRow<T extends FieldValues>({
  field,
  allowWildcard,
  splitSecondaryDefault,
  StatControl,
  label,
}: StatInspectorRowProps<T>) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const handleFieldFocusCapture = useInspectorTargetRegistration({
    targetId: field.targetId,
    containerRef: fieldRef,
    focusSelectors: ["input:not([disabled])", "button:not([disabled])"],
  });

  return (
    <div
      ref={fieldRef}
      className={layoutStyles.statRow}
      data-hqcc-edit={field.targetId}
      onFocusCapture={handleFieldFocusCapture}
    >
      <StatControl
        name={field.name}
        label={label}
        icon={field.icon}
        min={0}
        max={999}
        allowWildcard={allowWildcard}
        splitSecondaryDefault={splitSecondaryDefault}
      />
    </div>
  );
}
