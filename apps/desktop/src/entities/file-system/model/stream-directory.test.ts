import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import type { FileEntry } from "@yoophi/explorer-core";
import type { ScanEvent, ScanTransport } from "@yoophi/scan-client";
import { DirectoryProgressStore, directoryProgressFor } from "./directory-progress.ts";
import { loadDirectoryEntries } from "./load-directory.ts";
import { sortDirectoryEntries } from "./stream-directory.ts";

const entry = (name: string, isDir = false): FileEntry => ({
  name, path: `/root/${name}`, isDir, size: 0,
});

function fixture() {
  let receive: ((event: ScanEvent<FileEntry>) => void) | undefined;
  let starts = 0;
  let cancels = 0;
  const transport: ScanTransport<FileEntry> = {
    listen: async (listener) => {
      receive = listener;
      return () => { receive = undefined; };
    },
    start: async () => { assert.ok(receive, "listener precedes start"); starts++; },
    cancel: async () => { cancels++; },
  };
  return {
    transport,
    emit: (event: ScanEvent<FileEntry>) => receive?.(event),
    get starts() { return starts; },
    get cancels() { return cancels; },
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("directory-first case-folded order matches the legacy listing", () => {
  assert.deepEqual(
    sortDirectoryEntries([
      entry("z"), entry("a", true), entry("B"), entry("A", true),
      entry("😀"), entry("\uE000"),
    ]).map(({ name }) => name),
    ["a", "A", "B", "z", "\uE000", "😀"],
  );
});

test("publishes sorted batches before completion and keeps query data complete-only", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const progress = directoryProgressFor(client);
  const key = ["file-system", "dir", "/root", { showHidden: false }];
  const hash = JSON.stringify(key);
  const scan = fixture();
  const run = ({ signal }: { signal: AbortSignal }) =>
    loadDirectoryEntries(progress, hash, "scan-1", scan.transport, signal);
  const first = client.fetchQuery({ queryKey: key, queryFn: run });
  const second = client.fetchQuery({ queryKey: key, queryFn: run });
  let views = 0;
  const offA = progress.subscribe(hash, () => views++);
  const offB = progress.subscribe(hash, () => views++);
  await tick();
  assert.equal(scan.starts, 1);
  for (let index = 0; index < 16; index++) {
    scan.emit({ scanId: "scan-1", status: "item", item: entry(`z${index}`) });
  }
  scan.emit({ scanId: "scan-1", status: "item", item: entry("Folder", true) });
  assert.equal(progress.get(hash)?.length, 16);
  assert.equal(client.getQueryData(key), undefined);
  assert.ok(views >= 2, "both observers receive progress");
  scan.emit({ scanId: "scan-1", status: "completed" });
  const result = await first;
  assert.deepEqual(await second, result);
  assert.equal(result[0].name, "Folder");
  assert.equal(result.length, 17);
  assert.equal(progress.get(hash), undefined);
  assert.deepEqual(client.getQueryData(key), result);
  offA(); offB();
});

test("small slow directory shows its first item before completion", async () => {
  const progress = new DirectoryProgressStore();
  const scan = fixture();
  const task = loadDirectoryEntries(
    progress, "small", "scan-small", scan.transport, new AbortController().signal,
  );
  await tick();
  scan.emit({ scanId: "scan-small", status: "item", item: entry("only") });
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(progress.get("small")?.map(({ name }) => name), ["only"]);
  scan.emit({ scanId: "scan-small", status: "completed" });
  await task;
});

test("abort removes partial progress, cancels worker and ignores late items", async () => {
  const progress = new DirectoryProgressStore();
  const scan = fixture();
  const abort = new AbortController();
  const result = loadDirectoryEntries(progress, "path", "old", scan.transport, abort.signal);
  await tick();
  for (let index = 0; index < 16; index++) {
    scan.emit({ scanId: "old", status: "item", item: entry(`${index}`) });
  }
  assert.equal(progress.get("path")?.length, 16);
  abort.abort();
  await assert.rejects(result);
  assert.equal(scan.cancels, 1);
  assert.equal(progress.get("path"), undefined);
  scan.emit({ scanId: "old", status: "item", item: entry("late") });
  assert.equal(progress.get("path"), undefined);

  const replacement = fixture();
  const next = loadDirectoryEntries(progress, "path", "new", replacement.transport, new AbortController().signal);
  await tick();
  replacement.emit({ scanId: "new", status: "item", item: entry("current") });
  replacement.emit({ scanId: "new", status: "completed" });
  assert.deepEqual((await next).map(({ name }) => name), ["current"]);
  assert.equal(progress.get("path"), undefined);
});

test("last query observer unmount aborts the streaming worker", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["file-system", "dir", "/root", { showHidden: false }];
  const progress = directoryProgressFor(client);
  const scan = fixture();
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      loadDirectoryEntries(progress, JSON.stringify(key), "unmount", scan.transport, signal),
  });
  const unsubscribe = observer.subscribe(() => {});
  await tick();
  assert.equal(scan.starts, 1);
  unsubscribe();
  await tick();
  assert.equal(scan.cancels, 1);
  assert.equal(progress.get(JSON.stringify(key)), undefined);
  scan.emit({ scanId: "unmount", status: "item", item: entry("late") });
  assert.equal(client.getQueryData(key), undefined);
});

test("failed refetch leaves prior completed query cache intact", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["file-system", "dir", "/root", { showHidden: true }];
  const previous = [entry("prior")];
  client.setQueryData(key, previous);
  const progress = directoryProgressFor(client);
  const scan = fixture();
  const task = client.fetchQuery({
    queryKey: key,
    staleTime: 0,
    queryFn: ({ signal }: { signal: AbortSignal }) => loadDirectoryEntries(progress, JSON.stringify(key), "failed", scan.transport, signal),
  });
  await tick();
  for (let index = 0; index < 16; index++) {
    scan.emit({ scanId: "failed", status: "item", item: entry(`${index}`) });
  }
  assert.equal(progress.get(JSON.stringify(key))?.length, 16);
  assert.deepEqual(client.getQueryData(key), previous);
  scan.emit({ scanId: "failed", status: "failed", error: "permission denied" });
  await assert.rejects(task, /permission denied/);
  assert.equal(progress.get(JSON.stringify(key)), undefined);
  assert.deepEqual(client.getQueryData(key), previous);
  progress.begin("path", "new");
  progress.publish("path", "old", [entry("stale")]);
  progress.end("path", "old");
  assert.deepEqual(progress.get("path"), []);
});

test("root listing cache remains unavailable until every streamed entry completes", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["file-system", "dir", "/root", { showHidden: false }];
  const scan = fixture();
  const progress = directoryProgressFor(client);
  const task = client.fetchQuery({
    queryKey: key,
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      loadDirectoryEntries(progress, JSON.stringify(key), "root", scan.transport, signal),
  });
  await tick();
  for (let index = 0; index < 20; index++) {
    scan.emit({ scanId: "root", status: "item", item: entry(`dir-${index}`, true) });
  }
  assert.equal(progress.get(JSON.stringify(key))?.length, 16);
  assert.equal(client.getQueryData(key), undefined);
  scan.emit({ scanId: "root", status: "completed" });
  await task;
  assert.equal(client.getQueryData<FileEntry[]>(key)?.length, 20);
});
