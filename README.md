# tauri-tree-file-explorer

A desktop file explorer built with Tauri 2 — a 180px folder tree on the left
(rendered with [`@pierre/trees`](https://trees.software)) and the selected
folder's file list on the right.

## Stack

- **Shell**: Tauri 2 (Rust commands: `home_dir`, `list_dir`)
- **UI**: React 19, Vite 7, Tailwind CSS v4, shadcn/ui
- **Tree**: `@pierre/trees` (virtualized, VSCode-style file tree)
- **State**: TanStack Query (fs reads), Zustand (view settings), React Router
  (selected folder in `?path=` search param)

## Frontend structure (Feature-Sliced Design)

```
src/
├── app/        # providers (query, router), global styles, composition root
├── pages/
│   └── explorer/           # 2-column (180px | *) layout
├── widgets/
│   ├── folder-tree-panel/  # @pierre/trees, lazy-loads subfolders on select
│   └── file-list-panel/    # table of entries, click a folder to navigate
├── features/
│   ├── folder-navigation/  # ?path= search param <-> selected folder
│   └── toggle-hidden-files/# zustand store + toolbar button
├── entities/
│   └── file-system/        # tauri invoke api, react-query hooks, formatters
└── shared/
    ├── ui/                 # shadcn/ui components
    └── lib/                # cn() etc.
```

## Develop

```bash
npm install
npm run tauri dev
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
