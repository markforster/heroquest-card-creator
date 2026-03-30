"use client";

type ColorInputFieldProps = {
  value: string;
  disabled?: boolean;
  allowAlpha: boolean;
  className?: string;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancelOrReset: () => void;
};

export default function ColorInputField({
  value,
  disabled = false,
  allowAlpha,
  className,
  onDraftChange,
  onCommit,
  onCancelOrReset,
}: ColorInputFieldProps) {
  return (
    <input
      className={className}
      type="text"
      value={value}
      onChange={(event) => onDraftChange(event.target.value)}
      disabled={disabled}
      spellCheck={false}
      autoCapitalize="none"
      autoCorrect="off"
      inputMode="text"
      maxLength={allowAlpha ? 9 : 7}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancelOrReset();
        }
      }}
    />
  );
}
