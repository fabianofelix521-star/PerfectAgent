/**
 * Preview surface types: device sizing and live status.
 */

export type PreviewDevice = "mobile" | "tablet" | "desktop";

export type PreviewStatus =
  | "idle"
  | "booting"
  | "building"
  | "ready"
  | "error"
  | "reloading";

export interface PreviewDeviceSize {
  width: number;
  height: number;
}

export const DEVICE_SIZES: Record<PreviewDevice, PreviewDeviceSize> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1280, height: 800 },
};

export interface PreviewState {
  url: string | null;
  status: PreviewStatus;
  device: PreviewDevice;
  zoom: number;
  error: string | null;
}
