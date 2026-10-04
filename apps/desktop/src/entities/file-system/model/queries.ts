import { hashKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { directoryStreamTransport, fetchHomeDir } from "../api/file-system";
import { directoryProgressFor } from "./directory-progress";
import { loadDirectoryEntries } from "./load-directory";

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
  const queryClient = useQueryClient();
  const queryKey = fileSystemKeys.dir(path ?? "", showHidden);
  const progress = directoryProgressFor(queryClient);
  const progressKey = hashKey(queryKey);
  const partial = useSyncExternalStore(
    (listener) => progress.subscribe(progressKey, listener),
    () => progress.get(progressKey),
  );
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      const scanId = crypto.randomUUID();
      return loadDirectoryEntries(
        progress, progressKey, scanId,
        directoryStreamTransport(path as string, showHidden, scanId), signal,
      );
    },
    enabled: path !== null,
  });
  return {
    ...query,
    data: partial ?? query.data,
    completeData: query.data,
    isStreaming: partial !== undefined,
  };
}
