import { useQuery } from "@tanstack/react-query";
import { fetchDirEntries, fetchHomeDir } from "../api/file-system";

export const fileSystemKeys = {
  homeDir: ["file-system", "home-dir"] as const,
  dir: (path: string, showHidden: boolean) =>
    ["file-system", "dir", path, { showHidden }] as const,
};

export function useHomeDirQuery() {
  return useQuery({
    queryKey: fileSystemKeys.homeDir,
    queryFn: fetchHomeDir,
    staleTime: Infinity,
  });
}

export function useDirEntriesQuery(path: string | null, showHidden: boolean) {
  return useQuery({
    queryKey: fileSystemKeys.dir(path ?? "", showHidden),
    queryFn: () => fetchDirEntries(path as string, showHidden),
    enabled: path !== null,
  });
}
