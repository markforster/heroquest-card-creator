"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import ModalShell from "@/components/common/ModalShell";
import NavActionButton from "@/components/Layout/LeftNav/NavActionButton";
import {
  SETTINGS_AREAS,
  SETTINGS_NAV_CONFIG,
} from "@/components/Modals/SettingsModal/settings-areas";
import {
  SettingsModalProvider,
  SettingsPanelProvider,
  useSettingsModalControls,
} from "@/components/Modals/SettingsModal/SettingsModalContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { OpenCloseProps } from "@/types/ui";

export type SettingsModalProps = OpenCloseProps;

function SettingsModalContent({
  isOpen,
  activeAreaId,
}: {
  isOpen: boolean;
  activeAreaId: string | null;
}) {
  const { t } = useI18n();
  const { requestClose, requestAreaChange } = useSettingsModalControls();

  const enabledAreas = SETTINGS_AREAS.filter((area) => area.isEnabled !== false);
  const activeArea =
    enabledAreas.find((area) => area.id === activeAreaId) ?? enabledAreas[0] ?? null;
  const showAreaList = SETTINGS_NAV_CONFIG.forceShowAreaList || enabledAreas.length > 1;

  const renderActivePanel = () => {
    if (!activeArea) {
      return null;
    }
    return activeArea.panel();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={requestClose}
      title={t("actions.settings")}
      contentClassName={styles.settingsPopover}
    >
      <div
        className={`${styles.settingsLayout}${showAreaList ? "" : ` ${styles.settingsLayoutSingle}`}`}
      >
        {showAreaList ? (
          <div className={styles.settingsAreaList}>
            {enabledAreas.map((area) => {
              const Icon = area.icon;
              const isActive = area.id === activeArea?.id;
              return (
                <NavActionButton
                  key={area.id}
                  label={t(area.labelKey)}
                  icon={Icon}
                  onClick={() => requestAreaChange(area.id)}
                  isActive={isActive}
                  ariaLabel={t(area.labelKey)}
                  title={t(area.labelKey)}
                  className={`${styles.settingsAreaButton} d-flex align-items-center gap-2`}
                />
              );
            })}
          </div>
        ) : null}
        <div className={styles.settingsPanel}>
          <div className={styles.settingsPanelScroll} data-panel-id={activeArea?.id ?? ""}>
            {activeArea ? (
              <SettingsPanelProvider panelId={activeArea.id} label={t(activeArea.labelKey)}>
                {renderActivePanel()}
              </SettingsPanelProvider>
            ) : null}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstArea = SETTINGS_AREAS.find((area) => area.isEnabled !== false) ?? null;
    setActiveAreaId(firstArea?.id ?? null);
  }, [isOpen]);

  return (
    <SettingsModalProvider onClose={onClose} onAreaChange={(nextId) => setActiveAreaId(nextId)}>
      <SettingsModalContent activeAreaId={activeAreaId} isOpen={isOpen} />
    </SettingsModalProvider>
  );
}
