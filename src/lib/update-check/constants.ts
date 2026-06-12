export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const GITHUB_LATEST_RELEASE_URL =
  "https://api.github.com/repos/markforster/heroquest-card-creator/releases/latest";

export const NPM_REGISTRY_PACKAGE_URL =
  "https://registry.npmjs.org/%40markforster%2Fheroquest-card-creator";

export const HQCC_NPM_PACKAGE_URL =
  "https://www.npmjs.com/package/@markforster/heroquest-card-creator";

export const UPDATE_STORAGE_KEYS = {
  distribution: "hqcc.update.distribution",
  lastSuccessfulCheckAt: "hqcc.update.lastSuccessfulCheckAt",
  latestRemoteVersion: "hqcc.update.latestRemoteVersion",
  available: "hqcc.update.available",
  source: "hqcc.update.source",
} as const;
