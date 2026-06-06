import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useHomeDirQuery } from "@/entities/file-system";

/**
 * The selected folder lives in the `?path=` search param so navigation is
 * reflected in history (back/forward works). Falls back to the home directory.
 */
export function useSelectedFolder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: homeDir } = useHomeDirQuery();

  const selectedPath = searchParams.get("path") ?? homeDir ?? null;

  // react-router recreates setSearchParams whenever the URL changes, so it is
  // kept in a ref to hand consumers a stable selectFolder. Effects can then
  // depend on selectFolder without re-firing on every navigation (which would
  // replay stale state back into the URL).
  const setSearchParamsRef = useRef(setSearchParams);
  useEffect(() => {
    setSearchParamsRef.current = setSearchParams;
  });

  const selectFolder = useCallback((path: string) => {
    setSearchParamsRef.current((prev) => {
      const next = new URLSearchParams(prev);
      next.set("path", path);
      return next;
    });
  }, []);

  return { homeDir: homeDir ?? null, selectedPath, selectFolder };
}
