import type { LucideIcon } from "lucide-react";
import { Settings, Sparkles } from "lucide-react";

import type { MessageKey } from "@/i18n/messages";

export type SettingsAreaDefinition = {
  id: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  isEnabled?: boolean;
  panelId: "stat-label-overrides" | "settings-demo";
};

export const SETTINGS_NAV_CONFIG = {
  forceShowAreaList: true,
};

export const SETTINGS_AREAS: SettingsAreaDefinition[] = [
  {
    id: "stat-label-overrides",
    labelKey: "heading.statLabelOverrides",
    icon: Settings,
    panelId: "stat-label-overrides",
  },
  {
    id: "settings-demo",
    labelKey: "heading.settingsDemo",
    icon: Sparkles,
    panelId: "settings-demo",
  },
];
