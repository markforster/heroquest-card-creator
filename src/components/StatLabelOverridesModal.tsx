"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/ModalShell";
import { useStatLabelOverrides } from "@/components/StatLabelOverridesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { MessageKey } from "@/i18n/messages";
import {
  DEFAULT_STAT_LABELS,
  sanitizeStatLabelValue,
  type StatLabelKey,
  type StatLabelOverrides,
} from "@/lib/stat-labels";

type StatLabelOverridesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

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

export default function StatLabelOverridesModal({
  isOpen,
  onClose,
}: StatLabelOverridesModalProps) {
  const { t } = useI18n();
  const { overrides, setOverrides } = useStatLabelOverrides();
  const [formState, setFormState] = useState<StatLabelOverrides>(DEFAULT_STAT_LABELS);

  useEffect(() => {
    if (!isOpen) return;
    setFormState(overrides);
  }, [isOpen, overrides]);

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
    onClose();
  };

  const footer = useMemo(
    () => (
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onClose}>
          {t("actions.cancel")}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          {t("actions.save")}
        </button>
      </div>
    ),
    [handleSave, onClose],
  );

  const renderField = (field: FieldConfig) => (
    <div key={field.key} className="mb-2 d-flex align-items-end gap-2">
      <div className="flex-grow-1">
        <label htmlFor={field.key} className="form-label">
          {t(STAT_LABEL_DISPLAY_KEYS[field.labelKey])}
        </label>
        <input
          id={field.key}
          type="text"
          className="form-control form-control-sm"
          value={formState[field.key] as string}
          placeholder={t(STAT_LABEL_DISPLAY_KEYS[field.placeholderKey])}
          onChange={(event) => handleChange(field.key, event.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        onClick={() => handleClear(field.key)}
      >
        {t("actions.clear")}
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("heading.statLabelOverrides")}
      footer={footer}
      contentClassName={styles.statLabelsPopover}
    >
      <div className={styles.statLabelsScroll}>
        <div className="mb-3">
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.sharedStatText")}</h3>
          {sharedFields.map(renderField)}
        </div>
        <div className="mb-3">
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.monsterStatText")}</h3>
          {monsterFields.map(renderField)}
        </div>
        <div className="mb-3">
          <h3 className={styles.statLabelsSectionTitle}>{t("heading.heroStatText")}</h3>
          {heroFields.map(renderField)}
        </div>
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
      </div>
    </ModalShell>
  );
}
