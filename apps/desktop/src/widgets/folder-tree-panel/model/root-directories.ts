import type { FileEntry } from "@yoophi/explorer-core";

// FolderTree reads initialDirs only when its model is created. Use completed
// query data here; an in-flight snapshot must never seed that model.
export function rootDirectories(completeEntries: FileEntry[] | undefined): string[] | undefined {
  return completeEntries?.filter((entry) => entry.isDir).map((entry) => entry.path);
}

export function rootTreeKey(homeDir: string, showHidden: boolean, directories: string[]): string {
  return JSON.stringify([homeDir, showHidden, [...directories].sort()]);
}
