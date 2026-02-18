"use client";

import type { ReactNode } from "react";

type ProgressBarProps = {
  percent: number;
  trackClassName?: string;
  fillClassName?: string;
  label?: ReactNode;
};

export default function ProgressBar({
  percent,
  trackClassName = "",
  fillClassName = "",
  label,
}: ProgressBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className="d-flex flex-column gap-2">
      <div className={trackClassName} aria-hidden="true">
        <div className={fillClassName} style={{ width: `${clampedPercent}%` }} />
      </div>
      {label ? <div>{label}</div> : null}
    </div>
  );
}
