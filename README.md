# tauri-tree-file-explorer

A desktop file explorer built with Tauri 2 — a resizable folder tree on the
left (rendered with [`@pierre/trees`](https://trees.software)) and the selected
folder's file list on the right. Organized as a pnpm monorepo so the tree and
list UI can be reused by other apps.

## Features

- VSCode-style virtualized folder tree with lazy subfolder loading
- Single-highlight selection kept in sync with the URL (`?path=` search param,
  so back/forward works) — including navigation from the file list into
  collapsed branches (ancestors auto-expand and scroll into view)
- File list with size/modified columns; click a folder row to enter it
- Hidden-files toggle, drag-resizable split (layout persisted across restarts)

## Stack

- **Shell**: Tauri 2 (Rust commands: `home_dir`, `list_dir`)
- **UI**: React 19, Vite 7, Tailwind CSS v4, shadcn/ui
- **Tree**: `@pierre/trees` (virtualized, VSCode-style file tree)
- **State**: TanStack Query (fs reads), Zustand (view settings), React Router
  (selected folder in `?path=` search param)

## Monorepo layout

```
apps/
└── desktop/               # Tauri app — react-query/zustand/router wiring,
    ├── src/               # FSD: app/pages/widgets(thin adapters)/features/entities
    └── src-tauri/         # Rust commands
packages/
├── core/                  # @yoophi/explorer-core — FileEntry type + formatters (no deps)
├── ui/                    # @yoophi/ui — shadcn primitives, cn(), theme globals.css
├── file-tree/             # @yoophi/file-tree — controlled <FolderTree> (selection sync inside)
└── file-list/             # @yoophi/file-list — controlled <FileList>
```

Packages are **source packages** (shadcn-monorepo style): `exports` point at
`.tsx` source and the app's Vite bundles them — no per-package build step.
They depend only on React (peer) and each other; Tauri, react-query, zustand,
and react-router stay in `apps/desktop`. Design notes:
[docs/pnpm-monorepo-migration.md](docs/pnpm-monorepo-migration.md).

## Reusing the packages

Both UI packages are controlled components that speak **absolute paths** only —
they know nothing about Tauri, react-query, or routing. An app supplies data
and receives events:

```tsx
import { FolderTree } from "@yoophi/file-tree";
import { FileList } from "@yoophi/file-list";

<FolderTree
  root={homeDir}                 // tree root (absolute)
  initialDirs={rootSubdirs}      // seeds top-level rows; mount once these are known
  selectedPath={selectedPath}    // controlled selection (highlight/reveal handled inside)
  childDirs={subdirsOfSelected}  // lazily grafted as they become available
  onSelectFolder={setSelected}
/>

<FileList
  selectedPath={selectedPath}
  entries={entries}              // FileEntry[] from @yoophi/explorer-core
  loading={isPending}
  error={isError ? error : null}
  onOpenFolder={setSelected}
  headerActions={<MyToolbarButtons />}  // slot for app-provided controls
/>
```

The hard-won `@pierre/trees` selection-sync rules (event-driven
`onSelectionChange`, no chain flattening, ancestor reveal, exactly one
highlighted row) live inside `@yoophi/file-tree` — consumers don't
re-implement them.

Two integration notes for a new consumer app:

1. Import the theme once: `@import "@yoophi/ui/globals.css"` in your app CSS,
   and add `@source` directives for each workspace package you consume
   (Tailwind v4 does not scan workspace package sources automatically — see
   `apps/desktop/src/app/styles/index.css`).
2. Exclude the `@yoophi/*` packages from Vite's dependency pre-bundler
   (`optimizeDeps.exclude`) so their `.tsx` source is transformed like app code.

## Frontend structure (apps/desktop, Feature-Sliced Design)

```
src/
├── app/        # providers (query, router), global css, composition root
├── pages/
│   └── explorer/           # resizable 2-pane layout (drag the divider; persisted)
├── widgets/
│   ├── folder-tree-panel/  # adapter: route/query/zustand -> @yoophi/file-tree
│   └── file-list-panel/    # adapter: query state -> @yoophi/file-list
├── features/
│   ├── folder-navigation/  # ?path= search param <-> selected folder
│   └── toggle-hidden-files/# zustand store + toolbar button
└── entities/
    └── file-system/        # tauri invoke api + react-query hooks
```

## Develop

```bash
pnpm install
pnpm tauri dev        # from the repo root
```

Browser-only testing (no Tauri, mocked in-memory file system):
`pnpm dev` then open `http://localhost:1420/test.html`.

Useful root scripts: `pnpm build` (type-check + bundle the app),
`pnpm typecheck` (tsc across every workspace package).

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
