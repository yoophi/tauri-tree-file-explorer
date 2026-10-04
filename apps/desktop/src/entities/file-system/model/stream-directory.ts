import { compareCodePoints, type FileEntry } from "@yoophi/explorer-core";
import { consumeScan, type ScanTransport } from "@yoophi/scan-client";

export function sortDirectoryEntries(entries: FileEntry[]): FileEntry[] {
  return entries
    .map((entry) => ({ entry, name: Array.from(entry.name.toLowerCase()) }))
    .sort((left, right) => {
      if (left.entry.isDir !== right.entry.isDir) return left.entry.isDir ? -1 : 1;
      return compareCodePoints(left.name, right.name);
    })
    .map(({ entry }) => entry);
}

/** Publish immutable sorted snapshots while retaining the full final result. */
export async function collectDirectoryStream(
  transport: ScanTransport<FileEntry>,
  scanId: string,
  onSnapshot: (entries: FileEntry[]) => void,
  signal?: AbortSignal,
  batchSize = 16,
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let published = 0;
  const publish = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (entries.length === published) return;
    published = entries.length;
    onSnapshot(sortDirectoryEntries(entries));
  };
  try {
    await consumeScan(transport, scanId, (entry) => {
      entries.push(entry);
      if (entries.length - published >= batchSize) publish();
      else if (!timer) timer = setTimeout(publish, 30);
    }, signal);
  } finally {
    if (timer) clearTimeout(timer);
  }
  const final = sortDirectoryEntries(entries);
  if (entries.length !== published) onSnapshot(final);
  return final;
}
