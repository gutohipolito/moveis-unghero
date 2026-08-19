export type EnvironmentViewMode = "grid" | "list";
export type EnvironmentGridCols = 4 | 5 | 6;

export const ENVIRONMENT_VIEW_PREFS_KEY = "mu-project-environments-view";

export const ENVIRONMENT_GRID_COL_CLASS: Record<EnvironmentGridCols, string> = {
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
};

export function readEnvironmentViewPrefs(): {
  viewMode: EnvironmentViewMode;
  gridCols: EnvironmentGridCols;
} {
  if (typeof window === "undefined") {
    return { viewMode: "grid", gridCols: 4 };
  }
  try {
    const raw = window.localStorage.getItem(ENVIRONMENT_VIEW_PREFS_KEY);
    if (!raw) return { viewMode: "grid", gridCols: 4 };
    const saved = JSON.parse(raw) as {
      viewMode?: EnvironmentViewMode;
      gridCols?: EnvironmentGridCols;
    };
    return {
      viewMode: saved.viewMode === "list" ? "list" : "grid",
      gridCols:
        saved.gridCols === 5 || saved.gridCols === 6 ? saved.gridCols : 4,
    };
  } catch {
    return { viewMode: "grid", gridCols: 4 };
  }
}

export function writeEnvironmentViewPrefs(prefs: {
  viewMode: EnvironmentViewMode;
  gridCols: EnvironmentGridCols;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENVIRONMENT_VIEW_PREFS_KEY, JSON.stringify(prefs));
}
