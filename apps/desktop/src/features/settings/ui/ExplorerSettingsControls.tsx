import { useSettings } from "@yoophi/settings-core/react";
import { SettingsSection, SettingsStatus, SettingsToggle } from "@yoophi/settings-ui";
import { Button } from "@yoophi/ui-radix/components/button";
import { layoutSettings, preferencesSettings } from "../model/settings";
import { ToggleHiddenFilesButton } from "./ToggleHiddenFilesButton";

export function ExplorerSettingsControls({ onResetLayout }: { onResetLayout: () => void }) {
  const preferences = useSettings(preferencesSettings);
  const layout = useSettings(layoutSettings);

  return (
    <div className="flex items-center gap-2">
      <ToggleHiddenFilesButton />
      <details className="relative">
        <summary className="cursor-pointer rounded-md border px-3 py-1.5 text-sm">Settings</summary>
        <div className="absolute right-0 top-full z-20 mt-2 w-80 space-y-5 rounded-md border bg-background p-4 shadow-lg">
          <SettingsSection
            title="File preferences"
            actions={<Button variant="outline" size="sm" onClick={() => preferencesSettings.reset()}>Reset</Button>}
          >
            <SettingsToggle
              label="Show hidden files"
              checked={preferences.value.showHidden}
              onChange={(showHidden) => preferencesSettings.update(() => ({ showHidden }))}
            />
            <SettingsStatus error={preferences.error} />
          </SettingsSection>
          <SettingsSection
            title="Panel layout"
            actions={<Button variant="outline" size="sm" onClick={onResetLayout}>Reset</Button>}
          >
            <p className="text-xs text-muted-foreground">The divider position is saved automatically.</p>
            <SettingsStatus error={layout.error} />
          </SettingsSection>
        </div>
      </details>
    </div>
  );
}
