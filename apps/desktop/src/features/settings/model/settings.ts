import type { Layout } from "react-resizable-panels";
import { createSettingsStore } from "@yoophi/settings-core";
import type { SettingsStorage } from "@yoophi/settings-core";

export const PREFERENCES_KEY = "tauri-tree-file-explorer.preferences";
export const LAYOUT_KEY = "explorer-layout";

export interface Preferences {
  showHidden: boolean;
}

export function parsePreferences(value: unknown): Preferences {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid file preferences");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.showHidden !== "boolean") {
    throw new Error("Invalid file preferences");
  }
  return { showHidden: record.showHidden };
}

export function parseLayout(value: unknown): Layout {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid panel layout");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(record, "tree") ||
    !Object.prototype.hasOwnProperty.call(record, "files") ||
    typeof record.tree !== "number" ||
    typeof record.files !== "number" ||
    !Number.isFinite(record.tree) ||
    !Number.isFinite(record.files) ||
    record.tree < 0 || record.tree > 50 ||
    record.files < 50 || record.files > 100 ||
    Math.abs(record.tree + record.files - 100) > 0.02
  ) {
    throw new Error("Invalid panel layout");
  }
  return { tree: record.tree, files: record.files };
}

export function needsLayoutSync(current: Layout, desired: Layout): boolean {
  return (
    !Number.isFinite(current.tree) ||
    !Number.isFinite(current.files) ||
    Math.abs(current.tree - desired.tree) > 0.02 ||
    Math.abs(current.files - desired.files) > 0.02
  );
}

function defaultLayout(): Layout {
  // Match the previous 180px default tree width at the initial viewport size.
  const width = typeof window === "undefined" ? 1200 : window.innerWidth;
  const tree = Math.min(50, (180 / Math.max(width, 1)) * 100);
  return { tree, files: 100 - tree };
}

export function createPreferencesSettings(storage?: () => SettingsStorage) {
  return createSettingsStore({
    key: PREFERENCES_KEY,
    version: 1,
    defaults: { showHidden: false },
    parse: parsePreferences,
    storage,
  });
}

export function createLayoutSettings(storage?: () => SettingsStorage) {
  return createSettingsStore({
    key: LAYOUT_KEY,
    format: "raw",
    defaults: defaultLayout(),
    parse: parseLayout,
    storage,
  });
}

export const preferencesSettings = createPreferencesSettings();
export const layoutSettings = createLayoutSettings();
