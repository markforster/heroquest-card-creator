"use client";

import ModalBackdrop from "./ModalBackdrop";
import ModalBody from "./ModalBody";
import ModalFooter from "./ModalFooter";
import ModalHeader from "./ModalHeader";
import ModalPanel from "./ModalPanel";
import { useModalEscape } from "./useModalEscape";

import type { ReactNode } from "react";

type ModalShellProps = {
  isOpen: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  /** Optional extra class for the inner panel (e.g. cardsPopover). */
  contentClassName?: string;
  hideHeader?: boolean;
  keepMounted?: boolean;
};

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  headerActions,
  contentClassName,
  hideHeader = false,
  keepMounted = false,
}: ModalShellProps) {
  useModalEscape({ isOpen, onClose });

  if (!isOpen && !keepMounted) return null;

  return (
    <ModalBackdrop isOpen={isOpen} onClose={onClose}>
      <ModalPanel contentClassName={contentClassName}>
        <ModalHeader
          title={title}
          headerActions={headerActions}
          onClose={onClose}
          hideHeader={hideHeader}
        />
        <ModalBody>{children}</ModalBody>
        <ModalFooter>{footer}</ModalFooter>
      </ModalPanel>
    </ModalBackdrop>
  );
}
