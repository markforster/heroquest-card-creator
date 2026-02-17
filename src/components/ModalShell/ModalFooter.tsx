"use client";

import type { ReactNode } from "react";

type ModalFooterProps = {
  children?: ReactNode;
};

export default function ModalFooter({ children }: ModalFooterProps) {
  if (!children) {
    return null;
  }

  return <div className="modal-footer">{children}</div>;
}
