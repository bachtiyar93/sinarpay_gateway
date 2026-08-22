import { create } from "zustand";

export type SettingsTab = "profile" | "api-keys" | "webhooks";

type SettingsState = {
  activeTab: SettingsTab;
  confirmAction: string | null;
  showResult: boolean;
  setActiveTab: (tab: SettingsTab) => void;
  setConfirmAction: (action: string | null) => void;
  setShowResult: (value: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: "profile",
  confirmAction: null,
  showResult: false,
  setActiveTab: (activeTab) => set({ activeTab }),
  setConfirmAction: (confirmAction) => set({ confirmAction }),
  setShowResult: (showResult) => set({ showResult }),
}));
