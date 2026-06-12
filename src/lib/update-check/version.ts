type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

export function normalizeVersion(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/^v/i, "");
}

export function compareVersions(left: string, right: string): number {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  const numberDiff =
    compareNumber(parsedLeft.major, parsedRight.major) ||
    compareNumber(parsedLeft.minor, parsedRight.minor) ||
    compareNumber(parsedLeft.patch, parsedRight.patch);

  if (numberDiff !== 0) {
    return numberDiff;
  }

  return comparePrerelease(parsedLeft.prerelease, parsedRight.prerelease);
}

export function isRemoteVersionNewer(localVersion: string, remoteVersion: string): boolean {
  const normalizedLocal = normalizeVersion(localVersion);
  const normalizedRemote = normalizeVersion(remoteVersion);
  if (!normalizedLocal || !normalizedRemote) return false;
  return compareVersions(normalizedRemote, normalizedLocal) > 0;
}

function parseSemver(value: string): ParsedSemver {
  const normalized = normalizeVersion(value);
  if (!normalized) {
    throw new Error("Version is required");
  }

  const match =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
      normalized,
    );

  if (!match) {
    throw new Error(`Invalid semver version: ${value}`);
  }

  const [, major, minor, patch, prerelease] = match;

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ? prerelease.split(".") : [],
  };
}

function compareNumber(left: number, right: number): number {
  if (left === right) return 0;
  return left > right ? 1 : -1;
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];

    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;

    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const leftIsNumber = Number.isInteger(leftNumber) && leftPart === String(leftNumber);
    const rightIsNumber = Number.isInteger(rightNumber) && rightPart === String(rightNumber);

    if (leftIsNumber && rightIsNumber) {
      const diff = compareNumber(leftNumber, rightNumber);
      if (diff !== 0) return diff;
      continue;
    }

    if (leftIsNumber) return -1;
    if (rightIsNumber) return 1;

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  return 0;
}
