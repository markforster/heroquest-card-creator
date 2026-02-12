import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { ALargeSmall, Bug, Monitor, TableCellsSplit } from "lucide-react";

import type { MessageKey } from "@/i18n/messages";
import DebugSettingsPanel from "@/components/SettingsModal/DebugSettingsPanel";
import PreviewSettingsPanel from "@/components/SettingsModal/PreviewSettingsPanel";
import StatLabelOverridesPanel from "@/components/SettingsModal/StatLabelOverridesPanel";
import TextFittingSettingsPanel from "@/components/SettingsModal/TextFittingSettingsPanel";

export type SettingsAreaDefinition = {
  id: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  isEnabled?: boolean;
  panel: () => ReactNode;
};

export const SETTINGS_NAV_CONFIG = {
  forceShowAreaList: true,
};

export const SETTINGS_AREAS: SettingsAreaDefinition[] = [
  {
    id: "stat-label-overrides",
    labelKey: "heading.statLabelOverrides",
    icon: TableCellsSplit,
    panel: () => <StatLabelOverridesPanel />,
  },
  {
    id: "text-fitting-global",
    labelKey: "label.textFittingGlobal",
    icon: ALargeSmall,
    panel: () => <TextFittingSettingsPanel />,
  },
  {
    id: "preview-settings",
    labelKey: "heading.previewSettings",
    icon: Monitor,
    panel: () => <PreviewSettingsPanel />,
  },
  {
    id: "debug-settings",
    labelKey: "heading.debugTools",
    icon: Bug,
    panel: () => <DebugSettingsPanel />,
  },
];
