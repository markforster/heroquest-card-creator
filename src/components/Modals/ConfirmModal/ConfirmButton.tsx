"use client";

import type { ReactNode } from "react";

type ConfirmButtonProps = {
  label: ReactNode;
  onConfirm: () => void;
  isConfirming?: boolean;
};

export default function ConfirmButton({ label, onConfirm, isConfirming = false }: ConfirmButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={onConfirm}
      disabled={isConfirming}
    >
      {label}
    </button>
  );
}
