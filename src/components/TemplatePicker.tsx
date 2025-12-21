"use client";

import { useEffect, useState } from "react";

import ModalShell from "@/components/ModalShell";
import TemplatesList from "@/components/TemplatesList";
import { TemplateId } from "@/types/templates";

type TemplatePickerProps = {
  isOpen: boolean;
  currentTemplateId: string | null;
  onApply: (templateId: string) => void;
  onClose: () => void;
};

export default function TemplatePicker({
  isOpen,
  currentTemplateId,
  onApply,
  onClose,
}: TemplatePickerProps) {
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(currentTemplateId);

  // Keep local selection in sync when the current template changes while open.
  useEffect(() => {
    setPendingTemplateId(currentTemplateId);
  }, [currentTemplateId]);

  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Choose a template">
      <TemplatesList
        selectedId={pendingTemplateId as TemplateId | null}
        onSelect={(id) => {
          onApply(id);
          setTimeout(() => onClose(), 500);
        }}
        variant="grid"
      />
    </ModalShell>
  );
}
