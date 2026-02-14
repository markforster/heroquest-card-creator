import styles from "@/app/page.module.css";
import TextFittingSection from "@/components/ToolsToolbar/TextFittingSection";
import type { PreferencesByRole, TextRole } from "@/lib/text-fitting/types";

export type TextFittingSettingsFormProps = {
  preferences: PreferencesByRole;
  titleMinDraft: number;
  statMinDraft: number;
  setRolePreferences: (role: TextRole, updates: Partial<PreferencesByRole[TextRole]>) => void;
  onTitleMinDraftChange: (value: number) => void;
  onStatMinDraftChange: (value: number) => void;
  onDragStart: () => void;
  onDragEnd: (role: TextRole) => void;
  onResetTitle: () => void;
  onResetStat: () => void;
  labelTextFittingTitle: string;
  labelTextFittingStatHeadings: string;
  labelPreferEllipsis: string;
  labelMinFontSize: string;
  resetTitleLabel: string;
  resetStatLabel: string;
  globalHint: string;
};

export default function TextFittingSettingsForm({
  preferences,
  titleMinDraft,
  statMinDraft,
  setRolePreferences,
  onTitleMinDraftChange,
  onStatMinDraftChange,
  onDragStart,
  onDragEnd,
  onResetTitle,
  onResetStat,
  labelTextFittingTitle,
  labelTextFittingStatHeadings,
  labelPreferEllipsis,
  labelMinFontSize,
  resetTitleLabel,
  resetStatLabel,
  globalHint,
}: TextFittingSettingsFormProps) {
  return (
    <div className={styles.toolsToolbarPopoverBody}>
      <TextFittingSection
        role="title"
        title={labelTextFittingTitle}
        preferences={preferences}
        setRolePreferences={setRolePreferences}
        minDraft={titleMinDraft}
        onMinDraftChange={onTitleMinDraftChange}
        onDragStart={onDragStart}
        onDragEnd={() => onDragEnd("title")}
        onReset={onResetTitle}
        labelPreferEllipsis={labelPreferEllipsis}
        labelMinFontSize={labelMinFontSize}
        resetLabel={resetTitleLabel}
      />
      <TextFittingSection
        role="statHeading"
        title={labelTextFittingStatHeadings}
        preferences={preferences}
        setRolePreferences={setRolePreferences}
        minDraft={statMinDraft}
        onMinDraftChange={onStatMinDraftChange}
        onDragStart={onDragStart}
        onDragEnd={() => onDragEnd("statHeading")}
        onReset={onResetStat}
        labelPreferEllipsis={labelPreferEllipsis}
        labelMinFontSize={labelMinFontSize}
        resetLabel={resetStatLabel}
      />
      <div className={styles.toolsToolbarPopoverHint}>{globalHint}</div>
    </div>
  );
}
