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
};

(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
  invoke: async (cmd: string, args?: { path?: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    if (cmd === "home_dir") return HOME;
    if (cmd === "list_dir") return FS[args?.path ?? ""] ?? [];
    throw new Error(`unmocked command: ${cmd}`);
  },
  transformCallback: (cb: unknown) => cb,
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
};

import("./main");
