import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { FileEntry } from "@yoophi/explorer-core";
import type { ScanEvent, ScanTransport } from "@yoophi/scan-client";

export function fetchHomeDir(): Promise<string> {
  return invoke<string>("home_dir");
}

export function fetchDirEntries(
  path: string,
  showHidden: boolean,
): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_dir", { path, showHidden });
}

export function directoryStreamTransport(
  path: string,
  showHidden: boolean,
  scanId: string,
): ScanTransport<FileEntry> {
  return {
    listen: async (receive) => {
      const unlisten = await listen<ScanEvent<FileEntry>>("directory-scan", (event) => {
        receive(event.payload);
      });
      return () => { void unlisten(); };
    },
    start: () => invoke<void>("list_dir_stream", { path, showHidden, scanId }),
    cancel: () => invoke<void>("cancel_list_dir_stream", { scanId }),
  };
}
