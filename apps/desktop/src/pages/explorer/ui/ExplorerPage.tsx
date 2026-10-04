import { useEffect, useRef } from "react";
import type { GroupImperativeHandle, Layout } from "react-resizable-panels";
import { useSettings } from "@yoophi/settings-core/react";
import { layoutSettings, needsLayoutSync } from "@/features/settings";
import { FileListPanel } from "@/widgets/file-list-panel";
import { FolderTreePanel } from "@/widgets/folder-tree-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@yoophi/ui-radix/components/resizable";

export function ExplorerPage() {
  const layout = useSettings(layoutSettings);
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  // Apply explicit reset and valid changes from another window. Local drag
  // updates already match the group, so they do not create an update cycle.
  useEffect(() => {
    if (layout.error || !groupRef.current) return;
    const current = groupRef.current.getLayout();
    if (needsLayoutSync(current, layout.value)) {
      groupRef.current.setLayout(layout.value);
    }
  }, [layout]);

  const saveLayout = (next: Layout) => {
    // update rereads storage, so a damaged document is never overwritten by
    // the panel group's initial callback or by a later drag.
    layoutSettings.update(() => next);
  };

  return (
    <main className="h-svh">
      <ResizablePanelGroup groupRef={groupRef} defaultLayout={layout.value} onLayoutChanged={saveLayout}>
        <ResizablePanel id="tree" defaultSize="180px" minSize="120px" maxSize="50%">
          <aside className="h-full min-h-0 overflow-hidden">
            <FolderTreePanel />
          </aside>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="files">
          <section className="h-full min-h-0 overflow-hidden">
            <FileListPanel onResetLayout={() => layoutSettings.reset()} />
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
