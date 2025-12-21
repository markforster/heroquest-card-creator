import { spawnSync } from "node:child_process";
import { join } from "node:path";

const script = join(process.cwd(), "scripts/verify-env.js");

describe("verify-env script", () => {
  it("exits with code 1 when NEXT_PUBLIC_SITE_URL is missing or localhost", () => {
    const res = spawnSync(process.execPath, [script], {
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        NODE_ENV: "production",
      },
      encoding: "utf8",
    });
    expect(res.status).toBe(1);
    expect(res.stderr + res.stdout).toMatch(/Missing or invalid NEXT_PUBLIC_SITE_URL/);
  });

  it("passes when NEXT_PUBLIC_SITE_URL is a non-localhost URL", () => {
    const res = spawnSync(process.execPath, [script], {
      env: { ...process.env, NEXT_PUBLIC_SITE_URL: "https://example.com", NODE_ENV: "production" },
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Verified NEXT_PUBLIC_SITE_URL=https:\/\/example.com/);
  });
});
