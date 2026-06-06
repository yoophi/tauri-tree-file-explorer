import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import {
  formatBytes,
  formatModified,
  useDirEntriesQuery,
} from "@/entities/file-system";
import { useSelectedFolder } from "@/features/folder-navigation";
import {
  ToggleHiddenFilesButton,
  useHiddenFilesStore,
} from "@/features/toggle-hidden-files";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

export function FileListPanel() {
  const { selectedPath, selectFolder } = useSelectedFolder();
  const showHidden = useHiddenFilesStore((state) => state.showHidden);
  const { data: entries, isPending, isError, error } = useDirEntriesQuery(
    selectedPath,
    showHidden,
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {selectedPath ?? "…"}
        </h1>
        <ToggleHiddenFilesButton />
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Cannot read folder</EmptyTitle>
              <EmptyDescription>{String(error)}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Empty folder</EmptyTitle>
              <EmptyDescription>
                This folder does not contain any visible items.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-28 text-right">Size</TableHead>
                <TableHead className="w-44">Modified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.path}
                  className={entry.isDir ? "cursor-pointer" : undefined}
                  onClick={
                    entry.isDir ? () => selectFolder(entry.path) : undefined
                  }
                >
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {entry.isDir ? (
                        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{entry.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {entry.isDir ? "—" : formatBytes(entry.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatModified(entry.modifiedMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
