import { useEffect, useRef } from "react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useDirEntriesQuery } from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import { useHiddenFilesStore } from "@/features/toggle-hidden-files";
import { Skeleton } from "@/shared/ui/skeleton";
import { toAbsolutePath, toTreeId } from "../lib/paths";

export function FolderTreePanel() {
  const { homeDir } = useSelectedFolder();
  const showHidden = useHiddenFilesStore((state) => state.showHidden);
  const { data: rootEntries } = useDirEntriesQuery(homeDir, showHidden);

  // The tree model is created once, so mount it only after the root listing
  // is available to seed the top-level directories.
  if (homeDir === null || rootEntries === undefined) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  const initialDirIds = rootEntries
    .filter((entry) => entry.isDir)
    .map((entry) => `${entry.name}/`);

  return <FolderTree root={homeDir} initialDirIds={initialDirIds} />;
}

interface FolderTreeProps {
  root: string;
  initialDirIds: string[];
}

function FolderTree({ root, initialDirIds }: FolderTreeProps) {
  const { selectedPath, selectFolder } = useSelectedFolder();
  const showHidden = useHiddenFilesStore((state) => state.showHidden);

  // Tree -> route must be event-driven, not render-driven. Deriving it from
  // useFileTreeSelection loops: the hook returns a fresh array identity on
  // every render, so an effect keyed on it re-fires after each route change
  // and pushes the then-stale tree selection back into the URL, ping-ponging
  // with the route -> tree effect below. onSelectionChange fires only when
  // the selection actually changes; the ref keeps its logic current without
  // recreating the model.
  const selectedPathRef = useRef(selectedPath);
  const handleSelectionChangeRef = useRef<(paths: readonly string[]) => void>(
    () => {},
  );
  const { model } = useFileTree({
    paths: initialDirIds,
    initialExpansion: "closed",
    // Flattening collapses single-child chains ("a / b") into one row whose id
    // is the terminal path, which silently drops the selection highlight from
    // the intermediate folder the user actually clicked. Every folder gets its
    // own selectable row instead.
    flattenEmptyDirectories: false,
    onSelectionChange: (paths) => handleSelectionChangeRef.current(paths),
  });

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    handleSelectionChangeRef.current = (paths) => {
      // Programmatic select() is additive, so the most recent entry (last)
      // is the folder the user actually picked. Public ids are root-relative;
      // the route and backend speak absolute paths.
      const treeId = paths[paths.length - 1];
      if (treeId === undefined) return;
      const absolute = toAbsolutePath(treeId, root);
      if (absolute !== selectedPathRef.current) selectFolder(absolute);
    };
  }, [root, selectFolder]);

  // Lazily grow the tree: whenever the selected folder's listing is cached
  // (shared with the file-list query), graft its subdirectories in.
  const { data: selectedEntries } = useDirEntriesQuery(selectedPath, showHidden);
  useEffect(() => {
    if (selectedEntries === undefined) return;
    for (const entry of selectedEntries) {
      if (!entry.isDir) continue;
      const treeId = toTreeId(entry.path, root);
      if (treeId !== null && model.getItem(treeId) === null) {
        model.add(treeId);
      }
    }
  }, [selectedEntries, model, root]);

  // Route -> tree: keep exactly one row — the selected folder — highlighted.
  // select() does not clear previous selections, so stale ones (e.g. the
  // parent folder after navigating into a child) are deselected explicitly.
  useEffect(() => {
    if (selectedPath === null) return;
    const treeId = selectedPath === root ? null : toTreeId(selectedPath, root);
    if (treeId !== null && model.getItem(treeId) === null) {
      // Folder reached via the file list or a restored URL before its row
      // exists (e.g. a deep link): graft it in, ancestors are created
      // implicitly.
      model.add(treeId);
    }
    const item = treeId !== null ? model.getItem(treeId) : null;
    if (treeId !== null && item !== null && !item.isSelected()) {
      // Expand ancestors so the newly highlighted row is actually visible
      // (e.g. navigating via the file list while the branch is folded).
      const segments = treeId.split("/").filter(Boolean);
      for (let depth = 1; depth < segments.length; depth++) {
        const ancestor = model.getItem(`${segments.slice(0, depth).join("/")}/`);
        if (ancestor !== null && "expand" in ancestor && !ancestor.isExpanded()) {
          ancestor.expand();
        }
      }
      item.select();
      model.scrollToPath(treeId, { focus: false });
    }
    for (const path of model.getSelectedPaths()) {
      if (path !== treeId) model.getItem(path)?.deselect();
    }
  }, [selectedPath, model, root]);

  return (
    <FileTree
      model={model}
      aria-label="Folder tree"
      style={{ height: "100%" }}
    />
  );
}
