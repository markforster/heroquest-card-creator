import {
  fetchGithubLatestRelease,
  fetchNpmLatestVersion,
} from "@/lib/update-check/sources";

describe("update-check sources", () => {
  it("parses tag_name from the GitHub latest release endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v0.6.0" }),
    });

    await expect(fetchGithubLatestRelease(fetchMock)).resolves.toEqual({
      latestVersion: "0.6.0",
      source: "github",
    });
  });

  it("parses dist-tags.latest from the npm registry endpoint", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ "dist-tags": { latest: "0.6.0" } }),
    });

    await expect(fetchNpmLatestVersion(fetchMock)).resolves.toEqual({
      latestVersion: "0.6.0",
      source: "npm",
    });
  });
});
