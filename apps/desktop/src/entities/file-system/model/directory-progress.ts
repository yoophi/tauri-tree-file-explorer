import type { QueryClient } from "@tanstack/react-query";
import type { FileEntry } from "@yoophi/explorer-core";

type Progress = { scanId: string; entries: FileEntry[] };

export class DirectoryProgressStore {
  private readonly progress = new Map<string, Progress>();
  private readonly listeners = new Map<string, Set<() => void>>();

  get(key: string): FileEntry[] | undefined {
    return this.progress.get(key)?.entries;
  }

  subscribe(key: string, listener: () => void): () => void {
    const listeners = this.listeners.get(key) ?? new Set<() => void>();
    listeners.add(listener);
    this.listeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }

  begin(key: string, scanId: string): void {
    this.progress.set(key, { scanId, entries: [] });
    this.notify(key);
  }

  publish(key: string, scanId: string, entries: FileEntry[]): void {
    if (this.progress.get(key)?.scanId !== scanId) return;
    this.progress.set(key, { scanId, entries });
    this.notify(key);
  }

  end(key: string, scanId: string): void {
    if (this.progress.get(key)?.scanId !== scanId) return;
    this.progress.delete(key);
    this.notify(key);
  }

  private notify(key: string): void {
    this.listeners.get(key)?.forEach((listener) => listener());
  }
}

const stores = new WeakMap<QueryClient, DirectoryProgressStore>();

export function directoryProgressFor(client: QueryClient): DirectoryProgressStore {
  let store = stores.get(client);
  if (!store) {
    store = new DirectoryProgressStore();
    stores.set(client, store);
  }
  return store;
}
