"use client";

import { useMemo } from "react";

import { useEscapeModalAware } from "@/components/common/EscapeStackProvider";

type UseModalEscapeArgs = {
  isOpen: boolean;
  onClose: () => void;
};

export function useModalEscape({ isOpen, onClose }: UseModalEscapeArgs) {
  const escapeId = useMemo(() => `modal-${Math.random().toString(36).slice(2, 10)}`, []);

  useEscapeModalAware({
    id: escapeId,
    isOpen,
    onEscape: onClose,
  });
}
