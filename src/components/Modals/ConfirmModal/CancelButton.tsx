"use client";

import type { ReactNode } from "react";

type CancelButtonProps = {
  label: ReactNode;
  onCancel: () => void;
};

export default function CancelButton({ label, onCancel }: CancelButtonProps) {
  return (
    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onCancel}>
      {label}
    </button>
  );
}
