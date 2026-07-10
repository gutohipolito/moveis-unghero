export function buildLiveSnapshotVersion(
  rows: Array<Record<string, string | number | null | undefined>>
): string {
  return rows
    .map((row) =>
      Object.keys(row)
        .sort()
        .map((key) => `${key}:${row[key] ?? ""}`)
        .join(",")
    )
    .sort()
    .join("|");
}

export function hasLiveSnapshotChanged(currentVersion: string, nextVersion: string) {
  return currentVersion !== nextVersion;
}
