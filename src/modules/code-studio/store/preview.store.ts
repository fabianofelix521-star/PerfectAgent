import { create } from "zustand";
import type { PreviewDevice, PreviewState, PreviewStatus } from "../types";

interface PreviewStoreState extends PreviewState {
  setUrl: (url: string | null) => void;
  setStatus: (status: PreviewStatus) => void;
  setDevice: (device: PreviewDevice) => void;
  setZoom: (zoom: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initial: PreviewState = {
  url: null,
  status: "idle",
  device: "desktop",
  zoom: 1,
  error: null,
};

export const usePreviewStore = create<PreviewStoreState>((set) => ({
  ...initial,
  setUrl: (url) => set({ url }),
  setStatus: (status) => set({ status }),
  setDevice: (device) => set({ device }),
  setZoom: (zoom) => set({ zoom }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initial }),
}));
