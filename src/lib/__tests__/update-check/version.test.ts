import {
  compareVersions,
  isRemoteVersionNewer,
  normalizeVersion,
} from "@/lib/update-check/version";

describe("update-check version helpers", () => {
  it("treats v-prefixed and plain semver values as equal", () => {
    expect(normalizeVersion("v0.6.0")).toBe("0.6.0");
    expect(compareVersions("v0.6.0", "0.6.0")).toBe(0);
  });

  it("detects when the remote version is newer", () => {
    expect(isRemoteVersionNewer("0.5.9", "0.6.0")).toBe(true);
  });

  it("does not signal an update when versions are equal", () => {
    expect(isRemoteVersionNewer("0.6.0", "v0.6.0")).toBe(false);
  });
});
