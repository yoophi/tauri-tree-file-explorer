import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "../model/types";

export function fetchHomeDir(): Promise<string> {
  return invoke<string>("home_dir");
}

export function fetchDirEntries(
  path: string,
  showHidden: boolean,
): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("list_dir", { path, showHidden });
}
