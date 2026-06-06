import { create } from "zustand";

interface HiddenFilesState {
  showHidden: boolean;
  toggleShowHidden: () => void;
}

export const useHiddenFilesStore = create<HiddenFilesState>((set) => ({
  showHidden: false,
  toggleShowHidden: () => set((state) => ({ showHidden: !state.showHidden })),
}));
