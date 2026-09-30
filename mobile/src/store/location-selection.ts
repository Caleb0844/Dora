import { create } from 'zustand';

type SelectedLocation = {
  latitude: number;
  longitude: number;
} | null;

type LocationSelectionStore = {
  selectedLocation: SelectedLocation;
  setSelectedLocation: (location: SelectedLocation) => void;
  clearSelectedLocation: () => void;
};

export const useLocationSelectionStore =
  create<LocationSelectionStore>((set) => ({
    selectedLocation: null,

    setSelectedLocation: (location) =>
      set({ selectedLocation: location }),

    clearSelectedLocation: () =>
      set({ selectedLocation: null }),
  }));
