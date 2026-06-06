# tauri-tree-file-explorer

A desktop file explorer built with Tauri 2 — a resizable folder tree on the
left (rendered with [`@pierre/trees`](https://trees.software)) and the selected
folder's file list on the right. Organized as a pnpm monorepo so the tree and
list UI can be reused by other apps.

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

## Frontend structure (apps/desktop, Feature-Sliced Design)

```
src/
├── app/        # providers (query, router), composition root
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

Browser-only testing (no Tauri, mocked IPC): `pnpm dev` then open
`http://localhost:1420/test.html`.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
