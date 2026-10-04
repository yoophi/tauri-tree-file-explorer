import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLayoutSettings,
  createPreferencesSettings,
  LAYOUT_KEY,
  needsLayoutSync,
  PREFERENCES_KEY,
  parseLayout,
} from "./settings.ts";

function fixture(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: Array<[string, string]> = [];
  const storage = () => ({
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
      writes.push([key, value]);
    },
  });
  return { values, writes, storage };
}

test("raw layout roundtrips under the original key without a version wrapper", () => {
  const stored = '{"tree":18.068,"files":81.932}';
  const f = fixture({ [LAYOUT_KEY]: stored });
  const store = createLayoutSettings(f.storage);
  assert.deepEqual(store.getSnapshot(), {
    value: { tree: 18.068, files: 81.932 }, error: null,
  });
  assert.equal(f.writes.length, 0);
  assert.equal(store.update(() => ({ tree: 25, files: 75 })), true);
  assert.equal(f.values.get(LAYOUT_KEY), '{"tree":25,"files":75}');
});

test("strict layout parser rejects extra fields, invalid numbers and bad totals", () => {
  for (const value of [
    null, [], { tree: "20", files: 80 }, { tree: -1, files: 101 },
    { tree: 60, files: 40 }, { tree: 20, files: 79 },
    { tree: 20, files: 80, extra: true },
  ]) {
    assert.throws(() => parseLayout(value), /Invalid panel layout/);
  }
});

test("corrupt layout is preserved until explicit reset", () => {
  const corrupt = '{"tree":20,"files":"80"}';
  const f = fixture({ [LAYOUT_KEY]: corrupt });
  const store = createLayoutSettings(f.storage);
  assert.match(store.getSnapshot().error ?? "", /Invalid panel layout/);
  assert.equal(store.update(() => ({ tree: 25, files: 75 })), false);
  assert.equal(f.values.get(LAYOUT_KEY), corrupt);
  assert.equal(f.writes.length, 0);
  assert.equal(store.reset(), true);
  assert.equal(store.getSnapshot().error, null);
  assert.deepEqual(JSON.parse(f.values.get(LAYOUT_KEY) ?? ""), store.getSnapshot().value);
});

test("hidden preference toggles through one versioned store and rejects bad data", () => {
  const f = fixture();
  const store = createPreferencesSettings(f.storage);
  assert.equal(store.getSnapshot().value.showHidden, false);
  assert.equal(f.writes.length, 0);
  assert.equal(store.update((current) => ({ showHidden: !current.showHidden })), true);
  assert.deepEqual(JSON.parse(f.values.get(PREFERENCES_KEY) ?? ""), {
    version: 1, value: { showHidden: true },
  });
  const corrupt = '{"version":2,"value":{"showHidden":false}}';
  f.values.set(PREFERENCES_KEY, corrupt);
  assert.equal(store.update((current) => ({ showHidden: !current.showHidden })), false);
  assert.equal(f.values.get(PREFERENCES_KEY), corrupt);
  assert.equal(store.getSnapshot().value.showHidden, true);
});

test("external layout refresh signals one live sync without writing back", () => {
  const f = fixture({ [LAYOUT_KEY]: '{"tree":20,"files":80}' });
  const store = createLayoutSettings(f.storage);
  const previous = store.getSnapshot().value;
  const target = new EventTarget();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  try {
    const unsubscribe = store.subscribe(() => {});
    f.values.set(LAYOUT_KEY, '{"tree":30,"files":70}');
    const event = new Event("storage");
    Object.defineProperties(event, {
      key: { value: LAYOUT_KEY },
      storageArea: { value: null },
    });
    target.dispatchEvent(event);
    const next = store.getSnapshot().value;
    assert.equal(needsLayoutSync(previous, next), true);
    assert.equal(needsLayoutSync({ tree: 30.005, files: 69.995 }, next), false);
    assert.equal(store.update(() => next), true);
    assert.equal(f.writes.length, 0);
    unsubscribe();
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
