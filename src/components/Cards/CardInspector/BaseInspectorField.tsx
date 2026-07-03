"use client";


import layoutStyles from "@/app/page.module.css";
import {
  type EditorTargetId,
  useIsEditorTargetHovered,
} from "@/components/Cards/CardEditor/EditorTargetsContext";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";

import type { LucideIcon } from "lucide-react";
import type { FocusEventHandler, InputHTMLAttributes, ReactNode, Ref } from "react";

export type BaseInspectorFieldToggleProps = {
  id: string;
  title: string;
  ariaLabel: string;
  checked?: boolean;
  onChange?: () => void;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

export type BaseInspectorFieldProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  fieldRef?: Ref<HTMLDivElement>;
  error?: string | null;
  disabled?: boolean;
  showToggle?: boolean;
  onFocusCapture?: FocusEventHandler<HTMLDivElement>;
  targetId?: EditorTargetId;
  toggleProps?: BaseInspectorFieldToggleProps;
  toolbar?: ReactNode;
  headerExtras?: ReactNode;
  input: ReactNode;
  footer?: ReactNode;
};

export default function BaseInspectorField({
  id,
  label,
  icon,
  fieldRef,
  error,
  showToggle = false,
  onFocusCapture,
  targetId,
  toggleProps,
  toolbar,
  headerExtras,
  input,
  footer,
}: BaseInspectorFieldProps) {
  const isHovered = targetId ? useIsEditorTargetHovered(targetId) : false;

  return (
    <div
      ref={fieldRef}
      className={layoutStyles.editorTargetInspectorSurface}
      data-hqcc-edit={targetId}
      data-hqcc-hovered={isHovered ? "true" : "false"}
      onFocusCapture={onFocusCapture}
    >
      <div className={`d-flex align-items-center gap-2 ${layoutStyles.inspectorFieldHeader}`}>
        <div className="flex-grow-1 flex-shrink-0">
          <FormLabelWithIcon htmlFor={id} label={label} icon={icon} className="form-label mb-0" />
        </div>
        {toolbar ? toolbar : null}
        {showToggle && toggleProps ? (
          <div className="flex-grow-0 flex-shrink-1 form-check form-switch m-0">
            <input
              id={toggleProps.id}
              type="checkbox"
              className="form-check-input hq-toggle"
              title={toggleProps.title}
              aria-label={toggleProps.ariaLabel}
              role="switch"
              {...toggleProps.inputProps}
              checked={
                toggleProps.inputProps?.checked ??
                (toggleProps.checked as boolean | undefined)
              }
              onChange={
                toggleProps.inputProps?.onChange ??
                (toggleProps.onChange as (() => void) | undefined)
              }
              disabled={toggleProps.inputProps?.disabled ?? false}
            />
          </div>
        ) : null}
      </div>
      {headerExtras ? headerExtras : null}
      {input}
      {error ? (
        <div className="form-text text-danger">{error}</div>
      ) : null}
      {footer ? footer : null}
    </div>
  );
}
