"use client";

import type { ReactNode } from "react";

type ActionBarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function ActionBar({ left, right, className }: ActionBarProps) {
  const baseClassName = `d-flex align-items-center gap-2${className ? ` ${className}` : ""}`;

  return (
    <div className={baseClassName}>
      {left ? <div className="d-flex align-items-center gap-2">{left}</div> : null}
      {right ? <div className="d-flex align-items-center gap-2 ms-auto">{right}</div> : null}
    </div>
  );
}
