export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

export function isVersionGreater(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) > 0;
}

export function isVersionGreaterOrEqual(v1: string, v2: string): boolean {
  return compareVersions(v1, v2) >= 0;
}
