import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";

type UiState = {
  sidebarOpen: boolean;
  theme: ThemeMode;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  theme: "system",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
}));
