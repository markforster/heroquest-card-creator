import styles from "@/app/page.module.css";
import type { PreferencesByRole, TextRole } from "@/lib/text-fitting/types";

type TextFittingSectionProps = {
  role: TextRole;
  title: string;
  preferences: PreferencesByRole;
  setRolePreferences: (role: TextRole, updates: Partial<PreferencesByRole[TextRole]>) => void;
  minDraft: number;
  onMinDraftChange: (value: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReset: () => void;
  labelPreferEllipsis: string;
  labelMinFontSize: string;
  resetLabel: string;
};

export default function TextFittingSection({
  role,
  title,
  preferences,
  setRolePreferences,
  minDraft,
  onMinDraftChange,
  onDragStart,
  onDragEnd,
  onReset,
  labelPreferEllipsis,
  labelMinFontSize,
  resetLabel,
}: TextFittingSectionProps) {
  return (
    <div className={styles.toolsToolbarPopoverSection}>
      <div className={styles.toolsToolbarPopoverSectionTitle}>{title}</div>
      <label className={styles.toolsToolbarPopoverToggle}>
        <input
          type="checkbox"
          checked={Boolean(preferences[role].preferEllipsis)}
          onChange={(event) =>
            setRolePreferences(role, { preferEllipsis: event.target.checked })
          }
        />
        {labelPreferEllipsis}
      </label>
      <label className={styles.toolsToolbarPopoverLabel}>
        {labelMinFontSize}: {Math.round(minDraft)}%
        <input
          type="range"
          min={65}
          max={100}
          step={1}
          value={minDraft}
          onChange={(event) => onMinDraftChange(Number(event.target.value))}
          onPointerDown={onDragStart}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        />
      </label>
      <button type="button" className="btn btn-outline-light btn-sm" onClick={onReset}>
        {resetLabel}
      </button>
    </div>
  );
}
