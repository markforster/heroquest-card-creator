import { useCallback, useState } from "react";

export type PopupState = {
  isOpen: boolean;
  isClosed: boolean;
  open: () => void;
  close: () => void;
};

export function usePopupState(initialOpen = false): PopupState {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    isClosed: !isOpen,
    open,
    close,
  };
}

