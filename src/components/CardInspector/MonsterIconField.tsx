"use client";

import { ImagePlus, XCircle } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import layoutStyles from "@/app/page.module.css";
import { AssetsModal } from "@/components/Assets";
import IconButton from "@/components/IconButton";
import { usePopupState } from "@/hooks/usePopupState";
import { useI18n } from "@/i18n/I18nProvider";

type MonsterIconFieldProps = {
  label: string;
};

export default function MonsterIconField({ label }: MonsterIconFieldProps) {
  const { t } = useI18n();
  const {
    setValue,
    formState: { errors },
  } = useFormContext();

  const iconAssetId = useWatch({ name: "iconAssetId" }) as string | undefined;
  const iconAssetNameWatch = useWatch({ name: "iconAssetName" }) as string | undefined;
  const picker = usePopupState(false);

  const fieldError = (errors as Record<string, { message?: string }>).iconAssetId;
  const iconAssetName = iconAssetNameWatch;

  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
      <div className="input-group input-group-sm">
        <input
          type="text"
          className={`form-control ${layoutStyles.imageHeaderStatus} ${
            iconAssetId ? "" : layoutStyles.imageHeaderStatusMissing
          }`}
          readOnly
          value={
            iconAssetId
              ? (iconAssetName ?? t("status.imageSelected"))
              : t("status.noImageSelected")
          }
          title={iconAssetId ? (iconAssetName ?? iconAssetId) : t("status.noIconSelected")}
        />
        <IconButton
          className="btn btn-outline-secondary btn-sm"
          icon={ImagePlus}
          title={t("tooltip.openIconPicker")}
          onClick={() => {
            picker.open();
          }}
        >
          {t("actions.chooseImage")}
        </IconButton>
        {iconAssetId ? (
          <IconButton
            className="btn btn-outline-secondary btn-sm"
            icon={XCircle}
            title={t("tooltip.clearSelectedIcon")}
            onClick={() => {
              setValue("iconAssetId", undefined, { shouldDirty: true, shouldTouch: true });
              setValue("iconAssetName", undefined, { shouldDirty: true, shouldTouch: true });
            }}
          >
            <span className="visually-hidden">{t("actions.clear")}</span>
          </IconButton>
        ) : null}
      </div>
      {fieldError ? (
        <div className="form-text text-danger">
          {String(fieldError.message ?? t("errors.invalidValue"))}
        </div>
      ) : null}
      <AssetsModal
        isOpen={picker.isOpen}
        onClose={picker.close}
        mode="select"
        onSelect={(asset) => {
          setValue("iconAssetId", asset.id, { shouldDirty: true, shouldTouch: true });
          setValue("iconAssetName", asset.name, { shouldDirty: true, shouldTouch: true });
        }}
      />
    </div>
  );
}
