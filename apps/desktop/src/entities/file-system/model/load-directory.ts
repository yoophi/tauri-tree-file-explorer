import type { FileEntry } from "@yoophi/explorer-core";
import type { ScanTransport } from "@yoophi/scan-client";
import { DirectoryProgressStore } from "./directory-progress";
import { collectDirectoryStream } from "./stream-directory";

/** Query data is written only by React Query after a completed scan. */
export async function loadDirectoryEntries(
  progress: DirectoryProgressStore,
  key: string,
  scanId: string,
  transport: ScanTransport<FileEntry>,
  signal: AbortSignal,
): Promise<FileEntry[]> {
  progress.begin(key, scanId);
  try {
    return await collectDirectoryStream(
      transport,
      scanId,
      (entries) => progress.publish(key, scanId, entries),
      signal,
    );
  } finally {
    progress.end(key, scanId);
  }
}
