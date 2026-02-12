"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import styles from "@/app/page.module.css";
import { useSettingsPanel } from "@/components/SettingsModal/SettingsModalContext";
import { useStatLabelOverrides } from "@/components/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import {
  DEFAULT_STAT_LABELS,
  sanitizeStatLabelValue,
  type StatLabelKey,
  type StatLabelOverrides,
} from "@/lib/stat-labels";

type FieldConfig = {
  key: StatLabelKey;
  labelKey: StatLabelKey;
  placeholderKey: StatLabelKey;
};

const sharedFields: FieldConfig[] = [
  { key: "statsLabelAttack", labelKey: "statsLabelAttack", placeholderKey: "statsLabelAttack" },
  { key: "statsLabelDefend", labelKey: "statsLabelDefend", placeholderKey: "statsLabelDefend" },
];

const monsterFields: FieldConfig[] = [
  { key: "statsLabelMove", labelKey: "statsLabelMove", placeholderKey: "statsLabelMove" },
  {
    key: "statsLabelMonsterBodyPoints",
    labelKey: "statsLabelMonsterBodyPoints",
    placeholderKey: "statsLabelMonsterBodyPoints",
  },
  {
    key: "statsLabelMonsterMindPoints",
    labelKey: "statsLabelMonsterMindPoints",
    placeholderKey: "statsLabelMonsterMindPoints",
  },
];

const heroFields: FieldConfig[] = [
  {
    key: "statsLabelStartingPoints",
    labelKey: "statsLabelStartingPoints",
    placeholderKey: "statsLabelStartingPoints",
  },
  {
    key: "statsLabelHeroBody",
    labelKey: "statsLabelHeroBody",
    placeholderKey: "statsLabelHeroBody",
  },
  {
    key: "statsLabelHeroMind",
    labelKey: "statsLabelHeroMind",
    placeholderKey: "statsLabelHeroMind",
  },
];

const STAT_LABEL_DISPLAY_KEYS: Record<StatLabelKey, MessageKey> = {
  statsLabelAttack: "statsLabelAttack",
  statsLabelDefend: "statsLabelDefend",
  statsLabelMove: "statsLabelMove",
  statsLabelStartingPoints: "statsLabelStartingPoints",
  statsLabelHeroBody: "statsLabelHeroBody",
  statsLabelHeroMind: "statsLabelHeroMind",
  statsLabelMonsterBodyPoints: "statsLabelMonsterBodyPoints",
  statsLabelMonsterMindPoints: "statsLabelMonsterMindPoints",
  statsLabelBody: "statsLabelBody",
  statsLabelMind: "statsLabelMind",
};

const STAT_LABEL_FIELDS: (keyof StatLabelOverrides)[] = [
  "statLabelsEnabled",
  "statsLabelAttack",
  "statsLabelDefend",
  "statsLabelMove",
  "statsLabelStartingPoints",
  "statsLabelHeroBody",
  "statsLabelHeroMind",
  "statsLabelMonsterBodyPoints",
  "statsLabelMonsterMindPoints",
  "statsLabelBody",
  "statsLabelMind",
];

export default function StatLabelOverridesPanel() {
  const { t } = useI18n();
  const { overrides, setOverrides } = useStatLabelOverrides();
  const settingsPanel = useSettingsPanel();
  const [formState, setFormState] = useState<StatLabelOverrides>(DEFAULT_STAT_LABELS);
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle");
  const saveTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    setFormState(overrides);
  }, [overrides]);

  const isDirty = useMemo(
    () =>
      STAT_LABEL_FIELDS.some((key) => {
        return formState[key] !== overrides[key];
      }),
    [formState, overrides],
  );

  useEffect(() => {
    settingsPanel.setBlocked(
      isDirty,
      t("confirm.discardSettingsChangesBody"),
    );
  }, [isDirty, settingsPanel, t]);

  useEffect(() => {
    return () => {
      saveTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      saveTimeoutsRef.current = [];
    };
  }, []);

  const handleChange = (key: keyof StatLabelOverrides, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClear = (key: StatLabelKey) => {
    setFormState((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const handleSave = () => {
    const next: StatLabelOverrides = {
      ...formState,
      statLabelsEnabled: Boolean(formState.statLabelsEnabled),
      statsLabelAttack: sanitizeStatLabelValue(formState.statsLabelAttack),
      statsLabelDefend: sanitizeStatLabelValue(formState.statsLabelDefend),
      statsLabelMove: sanitizeStatLabelValue(formState.statsLabelMove),
      statsLabelStartingPoints: sanitizeStatLabelValue(formState.statsLabelStartingPoints),
      statsLabelHeroBody: sanitizeStatLabelValue(formState.statsLabelHeroBody),
      statsLabelHeroMind: sanitizeStatLabelValue(formState.statsLabelHeroMind),
      statsLabelMonsterBodyPoints: sanitizeStatLabelValue(formState.statsLabelMonsterBodyPoints),
      statsLabelMonsterMindPoints: sanitizeStatLabelValue(formState.statsLabelMonsterMindPoints),
      statsLabelBody: sanitizeStatLabelValue(formState.statsLabelBody),
      statsLabelMind: sanitizeStatLabelValue(formState.statsLabelMind),
    };

    setOverrides(next);
    settingsPanel.setBlocked(false);
    setSaveState("saving");
    saveTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    saveTimeoutsRef.current = [];
    saveTimeoutsRef.current.push(
      window.setTimeout(() => {
        setSaveState("idle");
      }, 500),
    );
    // settingsPanel.requestClose();
  };

  const statLabelFooter = useMemo(
    () => (
      <div className="d-flex align-items-center w-100">
        <div className="form-check">
          <input
            id="statLabelsEnabled"
            className="form-check-input"
            type="checkbox"
            checked={formState.statLabelsEnabled}
            onChange={(event) => handleChange("statLabelsEnabled", event.target.checked)}
          />
          <label className="form-check-label" htmlFor="statLabelsEnabled">
            {t("form.enableStatLabelOverrides")}
          </label>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </div>
    ),
    [formState.statLabelsEnabled, handleSave, saveState, settingsPanel, t],
  );

  const renderField = (field: FieldConfig) => {
    const value = formState[field.key] as string;
    const hasValue = value.trim().length > 0;

    return (
      <div key={field.key} className={styles.statLabelsField}>
        <div className={styles.statLabelsFieldHeader}>
          <label htmlFor={field.key} className="form-label">
            {t(STAT_LABEL_DISPLAY_KEYS[field.labelKey])}
          </label>
          {hasValue ? (
            <button
              type="button"
              className={styles.statLabelsClearButton}
              onClick={() => handleClear(field.key)}
            >
              {t("actions.clear")}
            </button>
          ) : null}
        </div>
        <input
          id={field.key}
          type="text"
          className="form-control form-control-sm"
          value={value}
          placeholder={t(STAT_LABEL_DISPLAY_KEYS[field.placeholderKey])}
          onChange={(event) => handleChange(field.key, event.target.value)}
        />
      </div>
    );
  };

  return (
    <div className={styles.settingsPanelBody}>
      <div className={styles.statLabelsScroll}>
        <div className={styles.statLabelsSection}>
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.sharedStatText")}</h3>
          <div className={styles.statLabelsGrid}>{sharedFields.map(renderField)}</div>
        </div>
        <div className={styles.statLabelsSection}>
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.monsterStatText")}</h3>
          <div className={styles.statLabelsGrid}>{monsterFields.map(renderField)}</div>
        </div>
        <div className={styles.statLabelsSection}>
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.heroStatText")}</h3>
          <div className={styles.statLabelsGrid}>{heroFields.map(renderField)}</div>
        </div>
      </div>
      <div className={styles.settingsPanelFooter}>{statLabelFooter}</div>
    </div>
  );
}
