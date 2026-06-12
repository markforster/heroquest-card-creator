import type { AppDistribution } from "@/lib/app-distribution";

export type UpdateSource = "github" | "npm";

export type UpdateCheckResult = {
  latestVersion: string;
  source: UpdateSource;
};

export type StoredUpdateState = {
  distribution: AppDistribution;
  lastSuccessfulCheckAt: number;
  latestRemoteVersion: string | null;
  isUpdateAvailable: boolean;
  source: UpdateSource | null;
};
