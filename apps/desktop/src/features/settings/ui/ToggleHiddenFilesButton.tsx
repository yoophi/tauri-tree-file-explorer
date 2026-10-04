import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useSettings } from "@yoophi/settings-core/react";
import { Button } from "@yoophi/ui-radix/components/button";
import { preferencesSettings } from "../model/settings";

export function ToggleHiddenFilesButton() {
  const { value: { showHidden } } = useSettings(preferencesSettings);
  const toggleShowHidden = () => {
    preferencesSettings.update((current) => ({ showHidden: !current.showHidden }));
  };

  return (
    <Button variant="outline" size="sm" onClick={toggleShowHidden}>
      {showHidden ? (
        <EyeOffIcon data-icon="inline-start" />
      ) : (
        <EyeIcon data-icon="inline-start" />
      )}
      {showHidden ? "Hide hidden" : "Show hidden"}
    </Button>
  );
}
