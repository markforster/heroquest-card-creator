import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { ALargeSmall, Bug, Copyright, Monitor, TableCellsSplit, Image } from "lucide-react";

import type { MessageKey } from "@/i18n/messages";
import CopyrightSettingsPanel from "@/components/Modals/SettingsModal/CopyrightSettingsPanel";
import DebugSettingsPanel from "@/components/Modals/SettingsModal/DebugSettingsPanel";
import PreviewSettingsPanel from "@/components/Modals/SettingsModal/PreviewSettingsPanel";
import StatLabelOverridesPanel from "@/components/Modals/SettingsModal/StatLabelOverridesPanel";
import TextFittingSettingsPanel from "@/components/Modals/SettingsModal/TextFittingSettingsPanel";
import AssetsSettingsPanel from "@/components/Modals/SettingsModal/AssetsSettingsPanel";
import { isDebugToolsEnabled } from "@/lib/env";

const debugToolsEnabled = isDebugToolsEnabled();

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
    id: "assets-settings",
    labelKey: "heading.assetsSettings",
    icon: Image,
    panel: () => <AssetsSettingsPanel />,
  },
  {
    id: "stat-label-overrides",
    labelKey: "heading.statLabelOverrides",
    icon: TableCellsSplit,
    panel: () => <StatLabelOverridesPanel />,
  },
  {
    id: "copyright-defaults",
    labelKey: "heading.copyrightDefaults",
    icon: Copyright,
    panel: () => <CopyrightSettingsPanel />,
  },
  {
    id: "text-fitting-global",
    labelKey: "label.textFittingGlobal",
    icon: ALargeSmall,
    panel: () => <TextFittingSettingsPanel />,
  },
  // {
  //   id: "preview-settings",
  //   labelKey: "heading.previewSettings",
  //   icon: Monitor,
  //   panel: () => <PreviewSettingsPanel />,
  // },
  {
    id: "debug-settings",
    labelKey: "heading.debugTools",
    icon: Bug,
    panel: () => <DebugSettingsPanel />,
    isEnabled: debugToolsEnabled,
  },
];
