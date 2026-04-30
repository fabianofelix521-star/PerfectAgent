import { useEffect, useState } from "react";
import { hotReloadManager, type HMRStatus } from "../engine/HotReloadManager";

export interface UseHotReloadResult {
  status: HMRStatus;
  notifyChange: (path: string, content: string) => void;
  forceReload: () => void;
}

export function useHotReload(): UseHotReloadResult {
  const [status, setStatus] = useState<HMRStatus>(() =>
    hotReloadManager.getStatus(),
  );

  useEffect(() => {
    return hotReloadManager.onStatusChange((s) => setStatus(s));
  }, []);

  return {
    status,
    notifyChange: (path, content) =>
      hotReloadManager.notifyChange(path, content),
    forceReload: () => hotReloadManager.forceReload(),
  };
}
