"use client";

import type { ReactNode, InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import layoutStyles from "@/app/page.module.css";
import FormLabelWithIcon from "@/components/Cards/CardInspector/FormLabelWithIcon";

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
  error?: string | null;
  disabled?: boolean;
  showToggle?: boolean;
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
  error,
  disabled = false,
  showToggle = false,
  toggleProps,
  toolbar,
  headerExtras,
  input,
  footer,
}: BaseInspectorFieldProps) {
  return (
    <div className="mb-2">
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
