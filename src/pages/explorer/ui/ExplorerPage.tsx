import { FileListPanel } from "@/widgets/file-list-panel";
import { FolderTreePanel } from "@/widgets/folder-tree-panel";

export function ExplorerPage() {
  return (
    <main className="grid h-svh grid-cols-[180px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-hidden border-r">
        <FolderTreePanel />
      </aside>
      <section className="min-h-0 overflow-hidden">
        <FileListPanel />
      </section>
    </main>
  );
}
