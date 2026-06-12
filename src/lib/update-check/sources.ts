import { GITHUB_LATEST_RELEASE_URL, NPM_REGISTRY_PACKAGE_URL } from "@/lib/update-check/constants";
import { normalizeVersion } from "@/lib/update-check/version";

import type { UpdateCheckResult } from "@/lib/update-check/types";

type FetchLike = typeof fetch;

export async function fetchGithubLatestRelease(fetchImpl: FetchLike = fetch): Promise<UpdateCheckResult> {
  const response = await fetchImpl(GITHUB_LATEST_RELEASE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GitHub latest release request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { tag_name?: string };
  const latestVersion = normalizeVersion(payload.tag_name);
  if (!latestVersion) {
    throw new Error("GitHub latest release response did not include a valid tag_name");
  }

  return {
    latestVersion,
    source: "github",
  };
}

export async function fetchNpmLatestVersion(fetchImpl: FetchLike = fetch): Promise<UpdateCheckResult> {
  const response = await fetchImpl(NPM_REGISTRY_PACKAGE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`npm registry request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { "dist-tags"?: { latest?: string } };
  const latestVersion = normalizeVersion(payload["dist-tags"]?.latest);
  if (!latestVersion) {
    throw new Error("npm registry response did not include dist-tags.latest");
  }

  return {
    latestVersion,
    source: "npm",
  };
}
