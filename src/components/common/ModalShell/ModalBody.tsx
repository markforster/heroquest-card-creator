"use client";

import type { ReactNode } from "react";

type ModalBodyProps = {
  children: ReactNode;
};

export default function ModalBody({ children }: ModalBodyProps) {
  return <div className="modal-body">{children}</div>;
}
