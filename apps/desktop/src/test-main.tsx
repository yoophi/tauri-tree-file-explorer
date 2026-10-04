// Dev-only harness: mocks the Tauri IPC layer with an in-memory file system
// so the real app can run in a plain browser for interaction testing.
const HOME = "/home/user";

interface MockEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedMs?: number;
}

const dir = (parent: string, name: string): MockEntry => ({
  name,
  path: `${parent}/${name}`,
  isDir: true,
  size: 0,
  modifiedMs: 1700000000000,
});
const file = (parent: string, name: string, size = 1234): MockEntry => ({
  name,
  path: `${parent}/${name}`,
  isDir: false,
  size,
  modifiedMs: 1700000000000,
});

const FS: Record<string, MockEntry[]> = {
  [HOME]: [
    dir(HOME, ".hidden"),
    dir(HOME, "Documents"),
    dir(HOME, "Downloads"),
    dir(HOME, "Pictures"),
    file(HOME, "notes.txt"),
  ],
  [`${HOME}/Documents`]: [
    dir(`${HOME}/Documents`, "Projects"),
    dir(`${HOME}/Documents`, "Reports"),
    file(`${HOME}/Documents`, "resume.pdf", 88_000),
  ],
  [`${HOME}/Documents/Projects`]: [
    dir(`${HOME}/Documents/Projects`, "alpha"),
    file(`${HOME}/Documents/Projects`, "readme.md"),
  ],
  [`${HOME}/Documents/Projects/alpha`]: [file(`${HOME}/Documents/Projects/alpha`, "main.rs")],
  [`${HOME}/Documents/Reports`]: [file(`${HOME}/Documents/Reports`, "q1.xlsx", 45_000)],
  [`${HOME}/Downloads`]: [dir(`${HOME}/Downloads`, "archive")],
  [`${HOME}/Downloads/archive`]: [file(`${HOME}/Downloads/archive`, "old.zip", 9_999_999)],
  [`${HOME}/Pictures`]: [],
  [`${HOME}/.hidden`]: [file(`${HOME}/.hidden`, "private.txt")],
};

type MockEvent = { scanId: string; status: "item"; item: MockEntry } |
  { scanId: string; status: "completed" | "cancelled" };
const listeners = new Map<number, (event: { payload: MockEvent }) => void>();
const cancelled = new Set<string>();
let nextListener = 1;
const emit = (payload: MockEvent) => {
  listeners.forEach((listener) => listener({ payload }));
};

(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
  invoke: async (cmd: string, args?: {
    path?: string; showHidden?: boolean; scanId?: string;
    handler?: (event: { payload: MockEvent }) => void; eventId?: number;
  }) => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    if (cmd === "home_dir") return HOME;
    if (cmd === "plugin:event|listen") {
      const id = nextListener++;
      listeners.set(id, args!.handler!);
      return id;
    }
    if (cmd === "plugin:event|unlisten") {
      listeners.delete(args!.eventId!);
      return;
    }
    if (cmd === "cancel_list_dir_stream") {
      cancelled.add(args!.scanId!);
      return;
    }
    if (cmd === "list_dir_stream") {
      const { scanId, path, showHidden } = args!;
      const entries = (FS[path ?? ""] ?? []).filter((entry) => showHidden || !entry.name.startsWith("."));
      void (async () => {
        for (const item of entries) {
          await new Promise((resolve) => setTimeout(resolve, 5));
          if (cancelled.has(scanId!)) break;
          emit({ scanId: scanId!, status: "item", item });
        }
        emit({ scanId: scanId!, status: cancelled.has(scanId!) ? "cancelled" : "completed" });
        cancelled.delete(scanId!);
      })();
      return;
    }
    if (cmd === "list_dir") {
      const entries = FS[args?.path ?? ""] ?? [];
      return args?.showHidden ? entries : entries.filter((entry) => !entry.name.startsWith("."));
    }
    throw new Error(`unmocked command: ${cmd}`);
  },
  transformCallback: (cb: unknown) => cb,
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
};
(window as unknown as Record<string, unknown>).__TAURI_EVENT_PLUGIN_INTERNALS__ = {
  unregisterListener: (_event: string, id: number) => listeners.delete(id),
};

import("./main");
