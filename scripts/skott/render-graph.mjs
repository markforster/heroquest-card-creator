import path from "node:path";
import { fileURLToPath } from "node:url";

import skott from "skott";
import { Web } from "skott/rendering";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function groupByPath(filePath) {
  const normalized = normalizePath(filePath);

  if (normalized.includes("/src/api/local/")) return "api/local plugins";
  if (normalized.includes("/src/lib/data/")) return "lib/data";
  if (normalized.includes("/src/lib/db/jobs/")) return "lib/db/jobs";
  if (normalized.includes("/src/lib/db/migrations/")) return "lib/db/migrations";
  if (normalized.includes("/src/lib/db/maintenance/")) return "lib/db/maintenance";
  if (normalized.includes("/src/lib/db/")) return "lib/db";
  if (normalized.includes("/src/lib/backup/")) return "lib/backup";
  if (normalized.includes("/src/lib/")) return "lib/support";
  if (normalized.includes("/src/types/")) return "types/contracts";
  if (normalized.includes("/scripts/skott/")) return "skott entry";

  return undefined;
}

const profiles = {
  "data-service": {
    apiConfig: {
      cwd: repoRoot,
      entrypoint: path.join("scripts", "skott", "data-service-entry.ts"),
      includeBaseDir: true,
      fileExtensions: [".ts", ".tsx"],
      tsConfigPath: "tsconfig.json",
      manifestPath: "package.json",
      incremental: false,
      dependencyTracking: {
        thirdParty: false,
        builtin: false,
        typeOnly: true,
      },
      ignorePatterns: [
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        ".next/**",
        "artefacts/**",
        "help-site/**",
        "node_modules/**",
        "out/**",
      ],
      groupBy: groupByPath,
      verbose: false,
    },
    applicationConfig: {
      visualization: {
        granularity: "module",
      },
    },
  },
  app: {
    apiConfig: {
      cwd: repoRoot,
      fileExtensions: [".ts", ".tsx"],
      tsConfigPath: "tsconfig.json",
      manifestPath: "package.json",
      incremental: false,
      dependencyTracking: {
        thirdParty: false,
        builtin: false,
        typeOnly: true,
      },
      ignorePatterns: [
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        ".next/**",
        "artefacts/**",
        "help-site/**",
        "node_modules/**",
        "out/**",
      ],
      groupBy: groupByPath,
      verbose: false,
    },
    applicationConfig: {
      visualization: {
        granularity: "group",
      },
    },
  },
};

const requestedProfile = process.env.SKOTT_PROFILE ?? "data-service";
const selectedProfile = profiles[requestedProfile];

if (!selectedProfile) {
  const knownProfiles = Object.keys(profiles).join(", ");
  throw new Error(`Unknown SKOTT_PROFILE '${requestedProfile}'. Available profiles: ${knownProfiles}`);
}

const port = Number.parseInt(process.env.PORT ?? "4177", 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT '${process.env.PORT ?? ""}'`);
}

await Web.renderWebApplication(selectedProfile.apiConfig, {
  ...selectedProfile.applicationConfig,
  port,
  watch: false,
  open: false,
  onListen: (listeningPort) => {
    console.log(
      `[skott] profile=${requestedProfile} url=http://127.0.0.1:${listeningPort}`,
    );
  },
  onOpenError: (error) => {
    console.error(`[skott] failed to open browser: ${error.message}`);
  },
});

await skott(selectedProfile.apiConfig);
