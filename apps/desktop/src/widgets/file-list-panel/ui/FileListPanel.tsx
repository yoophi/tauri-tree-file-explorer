import { FileList } from "@yoophi/file-list";
import { useDirEntriesQuery } from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import {
  ToggleHiddenFilesButton,
  useHiddenFilesStore,
} from "@/features/toggle-hidden-files";

/**
 * Thin adapter: maps the directory query state into the controlled
 * @yoophi/file-list component and injects the app's header controls.
 */
export function FileListPanel() {
  const { selectedPath, selectFolder } = useSelectedFolder();
  const showHidden = useHiddenFilesStore((state) => state.showHidden);
  const { data, isPending, isError, error } = useDirEntriesQuery(
    selectedPath,
    showHidden,
  );

  return (
    <FileList
      selectedPath={selectedPath}
      entries={data}
      loading={isPending}
      error={isError ? error : null}
      onOpenFolder={selectFolder}
      headerActions={<ToggleHiddenFilesButton />}
    />
  );
}
