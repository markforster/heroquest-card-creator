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
  { key: "statsLabelBody", labelKey: "statsLabelBody", placeholderKey: "statsLabelBody" },
  { key: "statsLabelMind", labelKey: "statsLabelMind", placeholderKey: "statsLabelMind" },
];

const monsterFields: FieldConfig[] = [
  { key: "statsLabelMove", labelKey: "statsLabelMove", placeholderKey: "statsLabelMove" },
];

const heroFields: FieldConfig[] = [
  {
    key: "statsLabelStartingPoints",
    labelKey: "statsLabelStartingPoints",
    placeholderKey: "statsLabelStartingPoints",
  },
];

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
      statsLabelBody: sanitizeStatLabelValue(formState.statsLabelBody),
      statsLabelMind: sanitizeStatLabelValue(formState.statsLabelMind),
      statsLabelMove: sanitizeStatLabelValue(formState.statsLabelMove),
      statsLabelStartingPoints: sanitizeStatLabelValue(formState.statsLabelStartingPoints),
    };

    setOverrides(next);
    onClose();
  };

  const footer = useMemo(
    () => (
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-outline-light btn-sm" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
          Save
        </button>
      </div>
    ),
    [handleSave, onClose],
  );

  const renderField = (field: FieldConfig) => (
    <div key={field.key} className="mb-2 d-flex align-items-end gap-2">
      <div className="flex-grow-1">
        <label htmlFor={field.key} className="form-label">
          {t(field.labelKey as MessageKey)}
        </label>
        <input
          id={field.key}
          type="text"
          className="form-control form-control-sm"
          value={formState[field.key] as string}
          placeholder={t(field.placeholderKey as MessageKey)}
          onChange={(event) => handleChange(field.key, event.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn btn-outline-light btn-sm"
        onClick={() => handleClear(field.key)}
      >
        Clear
      </button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Stat Label Overrides"
      footer={footer}
      contentClassName={styles.statLabelsPopover}
    >
      <div className="mb-3">
        <h3 className="h6 text-uppercase text-muted">Shared Stat Text</h3>
        {sharedFields.map(renderField)}
      </div>
      <div className="mb-3">
        <h3 className="h6 text-uppercase text-muted">Monster Card Stat Text</h3>
        {monsterFields.map(renderField)}
      </div>
      <div className="mb-3">
        <h3 className="h6 text-uppercase text-muted">Hero Card Stat Text</h3>
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
          Enable stat label overrides
        </label>
      </div>
    </ModalShell>
  );
}
