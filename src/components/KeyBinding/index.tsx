"use client";

import { useIsMac } from "./useIsMac";
import { useKeyBindingHandler } from "./useKeyBindingHandler";
import { useKeyBindingLabel } from "./useKeyBindingLabel";

type KeyBindingProps = {
  combo: {
    key: string;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    ctrl?: boolean;
  };
  onTrigger: () => void;
  label?: string;
  children: React.ReactNode;
};

export default function KeyBinding({ combo, onTrigger, children, label }: KeyBindingProps) {
  const isMac = useIsMac();
  const tooltip = useKeyBindingLabel({ combo, isMac, label });
  useKeyBindingHandler({ combo, onTrigger });

  return (
    <span title={tooltip} style={{ display: "contents" }}>
      {children}
    </span>
  );
}
