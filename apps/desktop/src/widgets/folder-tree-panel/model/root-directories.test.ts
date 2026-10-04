import assert from "node:assert/strict";
import { test } from "node:test";
import type { FileEntry } from "@yoophi/explorer-core";
import { rootDirectories, rootTreeKey } from "./root-directories.ts";

const entry = (name: string, isDir = false): FileEntry => ({
  name, path: `/root/${name}`, isDir, size: 0,
});

test("root tree has no seed until a completed listing is supplied", () => {
  assert.equal(rootDirectories(undefined), undefined);
  assert.deepEqual(rootDirectories([
    entry("a", true), entry("file"), entry("b", true),
  ]), ["/root/a", "/root/b"]);
});

test("root tree model survives equal refetches and changes only with directories or settings", () => {
  const root = "/root";
  const original = rootTreeKey(root, false, ["/root/a", "/root/b"]);
  assert.equal(rootTreeKey(root, false, ["/root/b", "/root/a"]), original);
  assert.equal(rootTreeKey(root, false, rootDirectories([
    entry("a", true), entry("b", true), entry("new-file"),
  ])!), original);
  assert.notEqual(rootTreeKey(root, false, ["/root/a", "/root/b", "/root/c"]), original);
  assert.notEqual(rootTreeKey(root, false, ["/root/a"]), original);
  assert.notEqual(rootTreeKey(root, true, ["/root/a", "/root/b"]), original);
  assert.notEqual(rootTreeKey("/other", false, ["/root/a", "/root/b"]), original);
});
