"use client";

import { apiClient } from "@/api/client";

import type {
  DeleteHeroBackLogoRemediation,
  HeroBackLogoRecord,
  HeroBackLogoUsageRecord,
} from "@/api/heroBackLogos";

type AddHeroBackLogoMeta = Omit<HeroBackLogoRecord, "id" | "createdAt" | "updatedAt"> & {
  createdAt?: number;
  updatedAt?: number;
};

export async function listHeroBackLogos() {
  return apiClient.listHeroBackLogos();
}

export async function getHeroBackLogoObjectUrl(id: string) {
  return apiClient.getHeroBackLogoObjectUrl({ params: { id } });
}

export async function getHeroBackLogoUsage(id: string): Promise<HeroBackLogoUsageRecord[]> {
  return apiClient.getHeroBackLogoUsage({ params: { id } });
}

export async function addHeroBackLogo(
  id: string,
  blob: Blob,
  meta: AddHeroBackLogoMeta,
) {
  return apiClient.addHeroBackLogo({
    id,
    blob,
    ...meta,
  });
}

export async function deleteHeroBackLogo(
  id: string,
  remediation: DeleteHeroBackLogoRemediation,
) {
  return apiClient.deleteHeroBackLogo(
    remediation as never,
    { params: { id } } as never,
  );
}
