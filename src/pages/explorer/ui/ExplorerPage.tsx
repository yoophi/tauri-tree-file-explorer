import type { Layout } from "react-resizable-panels";
import { FileListPanel } from "@/widgets/file-list-panel";
import { FolderTreePanel } from "@/widgets/folder-tree-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/ui/resizable";

const LAYOUT_STORAGE_KEY = "explorer-layout";

function loadLayout(): Layout | undefined {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? "");
  } catch {
    return undefined;
  }
}

function saveLayout(layout: Layout) {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

export function ExplorerPage() {
  return (
    <main className="h-svh">
      <ResizablePanelGroup defaultLayout={loadLayout()} onLayoutChanged={saveLayout}>
        <ResizablePanel id="tree" defaultSize="180px" minSize="120px" maxSize="50%">
          <aside className="h-full min-h-0 overflow-hidden">
            <FolderTreePanel />
          </aside>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="files">
          <section className="h-full min-h-0 overflow-hidden">
            <FileListPanel />
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
