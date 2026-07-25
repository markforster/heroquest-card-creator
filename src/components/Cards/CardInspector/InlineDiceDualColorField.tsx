"use client";

import { useState } from "react";

import ColorPickerField from "@/components/common/ColorPickerField";

import styles from "./InlineDiceDualColorField.module.css";

type InlineDiceDualColorFieldProps = {
  frontLabel: string;
  backLabel: string;
  frontColor: string;
  backColor: string;
  frontDefaultColor: string;
  backDefaultColor: string;
  presetSwatches: string[];
  onFrontColorChange: (value: string) => void;
  onBackColorChange: (value: string) => void;
  onFrontPopoverElementChange?: (element: HTMLDivElement | null) => void;
  onBackPopoverElementChange?: (element: HTMLDivElement | null) => void;
  disabled?: boolean;
};

export default function InlineDiceDualColorField({
  frontLabel,
  backLabel,
  frontColor,
  backColor,
  frontDefaultColor,
  backDefaultColor,
  presetSwatches,
  onFrontColorChange,
  onBackColorChange,
  onFrontPopoverElementChange,
  onBackPopoverElementChange,
  disabled = false,
}: InlineDiceDualColorFieldProps) {
  const [isFrontOpen, setIsFrontOpen] = useState(false);
  const [isBackOpen, setIsBackOpen] = useState(false);

  return (
    <div className={styles.field}>
      <div className={styles.trigger}>
        <div className={styles.backSwatch}>
          <ColorPickerField
            label={backLabel}
            inputValue={backColor}
            selectedValue={backColor}
            defaultColor={backDefaultColor}
            smartGroups={[]}
            isSmartBusy={false}
            onRequestSmart={() => undefined}
            onChange={onBackColorChange}
            allowAlpha={false}
            onSelectDefault={() => onBackColorChange(backDefaultColor)}
            onSelectTransparent={() => undefined}
            canRevert={false}
            onRevert={() => undefined}
            isOpen={isBackOpen}
            onToggleOpen={() => {
              setIsBackOpen((current) => !current);
              setIsFrontOpen(false);
            }}
            onClose={() => setIsBackOpen(false)}
            showLabel={false}
            showInput={false}
            showSmartTab={false}
            showSavedTab={false}
            showDefaultOption={false}
            showTransparentOption={false}
            showRevertOption={false}
            showSaveOption={false}
            presetSwatches={presetSwatches}
            renderInPortal
            onPopoverElementChange={onBackPopoverElementChange}
            isDisabled={disabled}
          />
        </div>
        <div className={styles.frontSwatch}>
          <ColorPickerField
            label={frontLabel}
            inputValue={frontColor}
            selectedValue={frontColor}
            defaultColor={frontDefaultColor}
            smartGroups={[]}
            isSmartBusy={false}
            onRequestSmart={() => undefined}
            onChange={onFrontColorChange}
            allowAlpha={false}
            onSelectDefault={() => onFrontColorChange(frontDefaultColor)}
            onSelectTransparent={() => undefined}
            canRevert={false}
            onRevert={() => undefined}
            isOpen={isFrontOpen}
            onToggleOpen={() => {
              setIsFrontOpen((current) => !current);
              setIsBackOpen(false);
            }}
            onClose={() => setIsFrontOpen(false)}
            showLabel={false}
            showInput={false}
            showSmartTab={false}
            showSavedTab={false}
            showDefaultOption={false}
            showTransparentOption={false}
            showRevertOption={false}
            showSaveOption={false}
            presetSwatches={presetSwatches}
            renderInPortal
            onPopoverElementChange={onFrontPopoverElementChange}
            isDisabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
