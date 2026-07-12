"use client";

import { Badge } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import getImageDimensions from "@/components/Assets/getImageDimensions";
import BaseInspectorField from "@/components/Cards/CardInspector/BaseInspectorField";
import FormSelect, { type FormSelectOption, type FormSelectRenderMeta } from "@/components/common/FormSelect";
import { useI18n } from "@/i18n/I18nProvider";
import { generateId } from "@/lib";
import {
  addHeroBackLogo,
  listHeroBackLogos,
  type DeleteHeroBackLogoRemediation,
  type HeroBackLogoRecord,
} from "@/lib/hero-back-logos-db";

import HeroBackLogoModal from "./HeroBackLogoModal";
import HeroBackLogoPreviewTile from "./HeroBackLogoPreviewTile";

type HeroBackLogoFieldProps = {
  label: string;
};

type HeroBackLogoSelectOption = FormSelectOption & {
  kind: "default" | "logo" | "add";
  logo?: HeroBackLogoRecord;
};

const DEFAULT_OPTION_VALUE = "__default__";
const ADD_OPTION_VALUE = "__add__";

function buildRemediationPatch(
  remediation: DeleteHeroBackLogoRemediation,
  replacement?: HeroBackLogoRecord | null,
) {
  if (remediation.mode === "default" || remediation.mode === "none") {
    return {
      heroBackLogoMode: "default" as const,
      heroBackLogoId: undefined,
      heroBackLogoName: undefined,
      heroBackLogoOriginalWidth: undefined,
      heroBackLogoOriginalHeight: undefined,
    };
  }

  return {
    heroBackLogoMode: "custom" as const,
    heroBackLogoId: remediation.logoId,
    heroBackLogoName: replacement?.name ?? remediation.logoName,
    heroBackLogoOriginalWidth: replacement?.width ?? remediation.width,
    heroBackLogoOriginalHeight: replacement?.height ?? remediation.height,
  };
}

function buildLogoSelectValue(logoMode?: "default" | "none" | "custom", logoId?: string) {
  return logoMode === "custom" && logoId ? logoId : DEFAULT_OPTION_VALUE;
}

export default function HeroBackLogoField({ label }: HeroBackLogoFieldProps) {
  const { t } = useI18n();
  const { setValue } = useFormContext();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [logos, setLogos] = useState<HeroBackLogoRecord[]>([]);
  const logoMode = (useWatch({ name: "heroBackLogoMode" }) as
    | "default"
    | "none"
    | "custom"
    | undefined) ?? "default";
  const logoId = useWatch({ name: "heroBackLogoId" }) as string | undefined;
  const logoName = useWatch({ name: "heroBackLogoName" }) as string | undefined;

  const reloadLogos = async () => {
    const next = await listHeroBackLogos();
    setLogos(next);
  };

  useEffect(() => {
    void reloadLogos();
  }, []);

  const applyDefaultLogo = () => {
    setValue("heroBackLogoMode", "default", { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoId", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoName", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoOriginalWidth", undefined, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoOriginalHeight", undefined, { shouldDirty: true, shouldTouch: true });
  };

  const applyCustomLogo = (logo: HeroBackLogoRecord) => {
    setValue("heroBackLogoMode", "custom", { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoId", logo.id, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoName", logo.name, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoOriginalWidth", logo.width, { shouldDirty: true, shouldTouch: true });
    setValue("heroBackLogoOriginalHeight", logo.height, { shouldDirty: true, shouldTouch: true });
  };

  const options = useMemo<HeroBackLogoSelectOption[]>(() => {
    const savedLogoOptions = logos.map((logo) => ({
      value: logo.id,
      label: logo.name,
      kind: "logo" as const,
      logo,
    }));

    const missingCurrentOption =
      logoMode === "custom" &&
      logoId &&
      !logos.some((logo) => logo.id === logoId)
        ? [
            {
              value: logoId,
              label: logoName?.trim() || t("status.noLogoSelected"),
              kind: "logo" as const,
            },
          ]
        : [];

    return [
      { value: DEFAULT_OPTION_VALUE, label: t("status.default"), kind: "default" },
      ...savedLogoOptions,
      ...missingCurrentOption,
      { value: ADD_OPTION_VALUE, label: t("actions.addAnother"), kind: "add" },
    ];
  }, [logoId, logoMode, logoName, logos, t]);

  const selectedValue = buildLogoSelectValue(logoMode, logoId);

  const renderOptionLabel = (option: HeroBackLogoSelectOption, meta: FormSelectRenderMeta) => {
    const maxHeight = meta.context === "value" ? 56 : 64;

    if (option.kind === "default") {
      return (
        <HeroBackLogoPreviewTile
          variant="default"
          ariaLabel={option.label}
          maxHeight={maxHeight}
          showBorder={false}
          testId={meta.context === "value" ? "hero-back-logo-select-value" : undefined}
        />
      );
    }

    if (option.kind === "logo") {
      return (
        <HeroBackLogoPreviewTile
          variant="custom"
          logoId={option.logo?.id ?? option.value}
          ariaLabel={option.label}
          maxHeight={maxHeight}
          showBorder={false}
          testId={meta.context === "value" ? "hero-back-logo-select-value" : undefined}
        />
      );
    }

    return <span>{option.label}</span>;
  };

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setIsBusy(true);
    try {
      const { width, height } = await getImageDimensions(file);
      const id = generateId();
      await addHeroBackLogo(id, file, {
        name: file.name,
        mimeType: file.type || "image/png",
        width,
        height,
      });
      const next = await listHeroBackLogos();
      setLogos(next);
      const uploaded = next.find((entry) => entry.id === id);
      if (uploaded) {
        applyCustomLogo(uploaded);
      }
    } finally {
      setIsBusy(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <BaseInspectorField
        id="hero-back-logo-mode"
        label={label}
        icon={Badge}
        toolbar={(
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setIsModalOpen(true)}
            disabled={isBusy}
          >
            {t("actions.manageLogos")}
          </button>
        )}
        input={(
          <div className="d-flex flex-column gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={(event) => {
                void handleUpload(event.target.files);
              }}
            />
            <FormSelect<HeroBackLogoSelectOption>
              inputId="hero-back-logo-mode"
              ariaLabel={label}
              options={options}
              value={selectedValue}
              disabled={isBusy}
              onChange={(nextValue) => {
                if (nextValue === DEFAULT_OPTION_VALUE) {
                  applyDefaultLogo();
                  return;
                }

                if (nextValue === ADD_OPTION_VALUE) {
                  uploadInputRef.current?.click();
                  return;
                }

                const selectedLogo = logos.find((logo) => logo.id === nextValue);
                if (selectedLogo) {
                  applyCustomLogo(selectedLogo);
                }
              }}
              renderOptionLabel={renderOptionLabel}
            />
            <div className="form-text m-0">{t("helper.heroBackLogo")}</div>
          </div>
        )}
      />
      <HeroBackLogoModal
        isOpen={isModalOpen}
        currentLogoId={logoId}
        onClose={() => setIsModalOpen(false)}
        onDeleted={(deletedLogoId, remediation, replacement) => {
          void reloadLogos();
          if (logoId !== deletedLogoId) {
            return;
          }
          const patch = buildRemediationPatch(remediation, replacement);
          setValue("heroBackLogoMode", patch.heroBackLogoMode, { shouldDirty: true, shouldTouch: true });
          setValue("heroBackLogoId", patch.heroBackLogoId, { shouldDirty: true, shouldTouch: true });
          setValue("heroBackLogoName", patch.heroBackLogoName, { shouldDirty: true, shouldTouch: true });
          setValue("heroBackLogoOriginalWidth", patch.heroBackLogoOriginalWidth, {
            shouldDirty: true,
            shouldTouch: true,
          });
          setValue("heroBackLogoOriginalHeight", patch.heroBackLogoOriginalHeight, {
            shouldDirty: true,
            shouldTouch: true,
          });
        }}
      />
    </>
  );
}
