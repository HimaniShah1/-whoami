import { create } from 'zustand';

interface UIState {
  audioMuted: boolean;
  volume: number;
  reducedMotion: boolean;
  activeOverlay: 'contact' | 'resume' | null;
  setReducedMotion: (value: boolean) => void;
  toggleMute: () => void;
  setVolume: (value: number) => void;
  openOverlay: (overlay: 'contact' | 'resume') => void;
  closeOverlay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  audioMuted: false,
  volume: 0.6,
  reducedMotion: false,
  activeOverlay: null,
  setReducedMotion: (value) => set({ reducedMotion: value }),
  toggleMute: () => set((state) => ({ audioMuted: !state.audioMuted })),
  setVolume: (value) => set({ volume: Math.min(1, Math.max(0, value)) }),
  openOverlay: (overlay) => set({ activeOverlay: overlay }),
  closeOverlay: () => set({ activeOverlay: null }),
}));
