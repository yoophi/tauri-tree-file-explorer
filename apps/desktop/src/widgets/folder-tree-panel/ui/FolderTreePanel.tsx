import { FolderTree } from "@yoophi/file-tree";
import { Skeleton } from "@yoophi/ui/components/skeleton";
import { useDirEntriesQuery } from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import { useHiddenFilesStore } from "@/features/toggle-hidden-files";

/**
 * Thin adapter: wires the route (?path=), the react-query cache, and the
 * hidden-files setting into the controlled @yoophi/file-tree component.
 */
export function FolderTreePanel() {
  const { homeDir, selectedPath, selectFolder } = useSelectedFolder();
  const showHidden = useHiddenFilesStore((state) => state.showHidden);
  const { data: rootEntries } = useDirEntriesQuery(homeDir, showHidden);
  // Shares the file-list panel's query via the react-query cache.
  const { data: selectedEntries } = useDirEntriesQuery(selectedPath, showHidden);

  // The tree model is created once from initialDirs, so mount the tree only
  // after the root listing is available.
  if (homeDir === null || rootEntries === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  const toDirPaths = (entries: typeof rootEntries) =>
    entries.filter((entry) => entry.isDir).map((entry) => entry.path);

  return (
    <FolderTree
      root={homeDir}
      initialDirs={toDirPaths(rootEntries)}
      selectedPath={selectedPath}
      childDirs={selectedEntries === undefined ? [] : toDirPaths(selectedEntries)}
      onSelectFolder={selectFolder}
    />
  );
}
