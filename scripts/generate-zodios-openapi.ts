import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { openApiBuilder } from "@zodios/openapi";

import { api } from "@/api";

type OpenApiPathItem = Record<string, unknown>;

type ExpectedOperation = {
  alias: string;
  method: string;
  declaredPath: string;
  openApiPath: string;
};

type GeneratedOperation = {
  method: string;
  openApiPath: string;
  operationId: string | null;
};

type ComparisonResult = {
  generatedAt: string;
  generator: {
    package: "@zodios/openapi";
    packageVersion: string;
  };
  expectedOperationCount: number;
  generatedOperationCount: number;
  missingOperations: ExpectedOperation[];
  extraOperations: GeneratedOperation[];
  matchedOperations: Array<ExpectedOperation & { operationId: string | null }>;
};

function normalizePathForOpenApi(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function normalizeMethod(method: string): string {
  return method.toLowerCase();
}

function compareOperations(
  expectedOperations: ExpectedOperation[],
  generatedOperations: GeneratedOperation[],
): ComparisonResult {
  const generatedMap = new Map(
    generatedOperations.map((operation) => [
      `${operation.method} ${operation.openApiPath}`,
      operation,
    ]),
  );

  const expectedMap = new Map(
    expectedOperations.map((operation) => [
      `${operation.method} ${operation.openApiPath}`,
      operation,
    ]),
  );

  const matchedOperations: Array<ExpectedOperation & { operationId: string | null }> = [];
  const missingOperations: ExpectedOperation[] = [];

  for (const operation of expectedOperations) {
    const key = `${operation.method} ${operation.openApiPath}`;
    const generated = generatedMap.get(key);
    if (!generated) {
      missingOperations.push(operation);
      continue;
    }
    matchedOperations.push({
      ...operation,
      operationId: generated.operationId,
    });
  }

  const extraOperations = generatedOperations.filter((operation) => {
    const key = `${operation.method} ${operation.openApiPath}`;
    return !expectedMap.has(key);
  });

  return {
    generatedAt: new Date().toISOString(),
    generator: {
      package: "@zodios/openapi",
      packageVersion: "10.5.0",
    },
    expectedOperationCount: expectedOperations.length,
    generatedOperationCount: generatedOperations.length,
    missingOperations,
    extraOperations,
    matchedOperations,
  };
}

function toMarkdown(result: ComparisonResult) {
  const lines: string[] = [];
  lines.push("# Zodios OpenAPI Generation Report");
  lines.push("");
  lines.push(`- Generated at: ${result.generatedAt}`);
  lines.push(`- Generator: ${result.generator.package}@${result.generator.packageVersion}`);
  lines.push(`- Declared Zodios operations: ${result.expectedOperationCount}`);
  lines.push(`- Generated OpenAPI operations: ${result.generatedOperationCount}`);
  lines.push(`- Missing operations: ${result.missingOperations.length}`);
  lines.push(`- Extra operations: ${result.extraOperations.length}`);
  lines.push("");

  if (result.missingOperations.length) {
    lines.push("## Missing Operations");
    lines.push("");
    for (const operation of result.missingOperations) {
      lines.push(
        `- \`${operation.method.toUpperCase()} ${operation.openApiPath}\` from alias \`${operation.alias}\` (declared as \`${operation.declaredPath}\`)`,
      );
    }
    lines.push("");
  }

  if (result.extraOperations.length) {
    lines.push("## Extra Operations");
    lines.push("");
    for (const operation of result.extraOperations) {
      const operationIdSuffix = operation.operationId ? `, operationId \`${operation.operationId}\`` : "";
      lines.push(
        `- \`${operation.method.toUpperCase()} ${operation.openApiPath}\`${operationIdSuffix}`,
      );
    }
    lines.push("");
  }

  lines.push("## Matched Operations");
  lines.push("");
  for (const operation of result.matchedOperations) {
    const operationIdSuffix = operation.operationId ? `, operationId \`${operation.operationId}\`` : "";
    lines.push(
      `- \`${operation.method.toUpperCase()} ${operation.openApiPath}\` from alias \`${operation.alias}\`${operationIdSuffix}`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

const openApiDocument = openApiBuilder({
  title: "HeroQuest Card Creator Local API",
  version: "0.8.0",
  description: "Generated from the current Zodios API declarations in src/api.",
})
  .addServer({ url: "/" })
  .addPublicApi(api)
  .build();

const expectedOperations: ExpectedOperation[] = api.map((endpoint) => ({
  alias: endpoint.alias,
  method: normalizeMethod(endpoint.method),
  declaredPath: endpoint.path,
  openApiPath: normalizePathForOpenApi(endpoint.path),
}));

const generatedOperations: GeneratedOperation[] = Object.entries(
  (openApiDocument.paths ?? {}) as Record<string, OpenApiPathItem>,
).flatMap(([openApiPath, pathItem]) =>
  Object.entries(pathItem)
    .filter(([method]) =>
      ["get", "post", "put", "delete", "patch", "options", "head", "trace"].includes(method),
    )
    .map(([method, operation]) => ({
      method: normalizeMethod(method),
      openApiPath,
      operationId:
        operation && typeof operation === "object" && "operationId" in operation
          ? String((operation as { operationId?: unknown }).operationId ?? "")
          : null,
    })),
);

const comparison = compareOperations(expectedOperations, generatedOperations);

const outputDir = resolve("artefacts/reports/api");
mkdirSync(outputDir, { recursive: true });

const openApiOutputPath = resolve(outputDir, "zodios-openapi.json");
const comparisonJsonPath = resolve(outputDir, "zodios-openapi-comparison.json");
const comparisonMarkdownPath = resolve(outputDir, "zodios-openapi-comparison.md");
const scalarAssetsOutputDir = resolve(outputDir, "scalar-browser");
const scalarHtmlOutputPath = resolve(outputDir, "scalar-api-reference.html");
const scalarBundleSourceDir = resolve(
  "node_modules/@scalar/api-reference/dist/browser",
);

for (const filePath of [
  openApiOutputPath,
  comparisonJsonPath,
  comparisonMarkdownPath,
  scalarHtmlOutputPath,
]) {
  mkdirSync(dirname(filePath), { recursive: true });
}

writeFileSync(openApiOutputPath, JSON.stringify(openApiDocument, null, 2));
writeFileSync(comparisonJsonPath, JSON.stringify(comparison, null, 2));
writeFileSync(comparisonMarkdownPath, toMarkdown(comparison));
cpSync(scalarBundleSourceDir, scalarAssetsOutputDir, { recursive: true });

const scalarHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HeroQuest Card Creator API Reference</title>
    <style>
      html, body, #app {
        height: 100%;
        margin: 0;
      }
      body {
        background: #0f1115;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script src="./scalar-browser/standalone.js"></script>
    <script>
      const specification = ${JSON.stringify(openApiDocument, null, 2)};

      Scalar.createApiReference('#app', {
        content: specification,
        title: 'HeroQuest Card Creator API Reference',
        layout: 'modern',
        theme: 'default',
        showSidebar: true,
        hideClientButton: true,
        showDeveloperTools: 'never',
        showToolbar: true,
        operationTitleSource: 'path',
        documentDownloadType: 'direct',
        documentUrl: './zodios-openapi.json',
      });
    </script>
  </body>
</html>
`;

writeFileSync(scalarHtmlOutputPath, scalarHtml);

console.log(
  JSON.stringify(
    {
      openApiOutputPath,
      comparisonJsonPath,
      comparisonMarkdownPath,
      scalarHtmlOutputPath,
      scalarAssetsOutputDir,
      expectedOperationCount: comparison.expectedOperationCount,
      generatedOperationCount: comparison.generatedOperationCount,
      missingOperationCount: comparison.missingOperations.length,
      extraOperationCount: comparison.extraOperations.length,
    },
    null,
    2,
  ),
);
