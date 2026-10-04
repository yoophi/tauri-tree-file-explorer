import { useMemo } from "react";
import { useSettings } from "@yoophi/settings-core/react";
import { FolderTree } from "@yoophi/file-tree";
import { Skeleton } from "@yoophi/ui-radix/components/skeleton";
import type { FileEntry } from "@yoophi/explorer-core";
import { useDirEntriesQuery } from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import { preferencesSettings } from "@/features/settings";
import { rootDirectories, rootTreeKey } from "../model/root-directories";

const toDirPaths = (entries: FileEntry[]) =>
  entries.filter((entry) => entry.isDir).map((entry) => entry.path);

/**
 * Thin adapter: wires the route (?path=), the react-query cache, and the
 * hidden-files setting into the controlled @yoophi/file-tree component.
 */
export function FolderTreePanel() {
  const { homeDir, selectedPath, selectFolder } = useSelectedFolder();
  const { value: { showHidden } } = useSettings(preferencesSettings);
  const { completeData: rootEntries } = useDirEntriesQuery(homeDir, showHidden);
  const initialDirs = rootDirectories(rootEntries);
  // Shares the file-list panel's query via the react-query cache.
  const { data: selectedEntries } = useDirEntriesQuery(selectedPath, showHidden);

  // Stable identity so the package's graft effect runs only when the listing
  // actually changes, not on every adapter render.
  const childDirs = useMemo(
    () => (selectedEntries === undefined ? [] : toDirPaths(selectedEntries)),
    [selectedEntries],
  );

  // The tree model is created once from initialDirs, so mount the tree only
  // after the root listing is available.
  if (homeDir === null || initialDirs === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  return (
    <FolderTree
      key={rootTreeKey(homeDir, showHidden, initialDirs)}
      root={homeDir}
      initialDirs={initialDirs}
      selectedPath={selectedPath}
      childDirs={childDirs}
      onSelectFolder={selectFolder}
    />
  );
}
