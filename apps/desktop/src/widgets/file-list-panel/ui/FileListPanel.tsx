import { FileList } from "@yoophi/file-list";
import { useSettings } from "@yoophi/settings-core/react";
import { useDirEntriesQuery } from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import { ExplorerSettingsControls, preferencesSettings } from "@/features/settings";

/**
 * Thin adapter: maps the directory query state into the controlled
 * @yoophi/file-list component and injects the app's header controls.
 */
export function FileListPanel({ onResetLayout }: { onResetLayout: () => void }) {
  const { selectedPath, selectFolder } = useSelectedFolder();
  const { value: { showHidden } } = useSettings(preferencesSettings);
  const { data, isFetching, isStreaming, isError, error } = useDirEntriesQuery(
    selectedPath,
    showHidden,
  );

  return (
    <FileList
      selectedPath={selectedPath}
      entries={data}
      loading={isFetching && (data?.length ?? 0) === 0 && !isError}
      error={isError ? error : null}
      onOpenFolder={selectFolder}
      headerActions={
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span role="status" className="text-xs text-muted-foreground">
              Scanning… {data?.length ?? 0}
            </span>
          )}
          <ExplorerSettingsControls onResetLayout={onResetLayout} />
        </div>
      }
    />
  );
}
