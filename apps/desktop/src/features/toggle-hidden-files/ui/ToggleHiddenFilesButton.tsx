import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@yoophi/ui/components/button";
import { useHiddenFilesStore } from "../model/store";

export function ToggleHiddenFilesButton() {
  const showHidden = useHiddenFilesStore((state) => state.showHidden);
  const toggleShowHidden = useHiddenFilesStore(
    (state) => state.toggleShowHidden,
  );

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
