import { useCallback, useEffect } from "react";
import { previewServerManager } from "../engine/PreviewServerManager";
import { hotReloadManager } from "../engine/HotReloadManager";
import { usePreviewStore } from "../store/preview.store";
import { DEVICE_SIZES } from "../types";
import type { PreviewDevice, PreviewDeviceSize, PreviewStatus } from "../types";

export interface UsePreviewResult {
  url: string | null;
  status: PreviewStatus;
  device: PreviewDevice;
  deviceSize: PreviewDeviceSize;
  zoom: number;
  error: string | null;
  setDevice: (device: PreviewDevice) => void;
  setZoom: (zoom: number) => void;
  refresh: () => void;
  reconnect: () => Promise<string>;
}

export function usePreview(): UsePreviewResult {
  const store = usePreviewStore();

  useEffect(() => {
    const offReady = previewServerManager.onReady((info) => {
      store.setUrl(info.url);
      store.setStatus("ready");
      store.setError(null);
    });
    const offError = previewServerManager.onError((err) => {
      store.setStatus("error");
      store.setError(err.message);
    });
    return () => {
      offReady();
      offError();
    };
  }, [store]);

  const refresh = useCallback(() => {
    if (!store.url) return;
    store.setStatus("reloading");
    hotReloadManager.forceReload();
    // Bust the iframe by toggling URL.
    const url = store.url;
    store.setUrl(null);
    queueMicrotask(() => {
      store.setUrl(url);
      store.setStatus("ready");
    });
  }, [store]);

  return {
    url: store.url,
    status: store.status,
    device: store.device,
    deviceSize: DEVICE_SIZES[store.device],
    zoom: store.zoom,
    error: store.error,
    setDevice: store.setDevice,
    setZoom: store.setZoom,
    refresh,
    reconnect: () => previewServerManager.reconnect(),
  };
}
